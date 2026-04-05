"""Core Stage A editor services and spec mutation logic."""

from __future__ import annotations

import base64
import copy
import json
from dataclasses import dataclass
from typing import Any

import altair as alt
import vl_convert as vlc

from .constants import (
    AXIS_CHANNELS,
    EDITOR_VERSION,
    LAYER_WRAPPER_KEYS,
    LEGEND_CHANNELS,
    READ_ONLY_COMPOSITION_KEYS,
    SCHEMA_URL,
    SUPPORTED_MARK_TYPES,
)
from .models import (
    DocumentResponse,
    FieldDescriptor,
    ObjectDescriptor,
    SelectOption,
    SupportMode,
    SupportStatus,
)


class EditorError(ValueError):
    """User-facing editor error with optional details."""

    def __init__(self, message: str, *, details: str | None = None) -> None:
        super().__init__(message)
        self.message = message
        self.details = details


@dataclass(slots=True)
class SupportAnalysis:
    mode: SupportMode
    warnings: list[str]


def build_document_from_text(spec_text: str) -> dict[str, Any]:
    """Parse a raw spec string and build the editor document response."""
    try:
        spec = json.loads(spec_text)
    except json.JSONDecodeError as exc:
        raise EditorError(
            "The supplied chart is not valid JSON.",
            details=f"Line {exc.lineno}, column {exc.colno}: {exc.msg}",
        ) from exc

    if not isinstance(spec, dict):
        raise EditorError("The supplied chart must be a top-level JSON object.")

    return build_document(spec)


def build_document(spec: dict[str, Any]) -> dict[str, Any]:
    """Build the editor state for a Vega-Lite spec."""
    working = copy.deepcopy(spec)
    if not isinstance(working, dict):
        raise EditorError("The chart specification must be a JSON object.")

    working.setdefault("$schema", SCHEMA_URL)
    _validate_spec(working)

    support = _analyze_support(working)
    if support.mode is SupportMode.editable:
        working = _ensure_editor_metadata(working)
        working = _rebuild_annotation_layers(working)
        _validate_spec(working)
        objects = _build_objects(working)
    else:
        objects = []

    document = DocumentResponse(
        spec=working,
        spec_json=json.dumps(working, indent=2, sort_keys=True),
        python_code=_build_python_snippet(working),
        preview_data_url=_render_preview_data_url(working),
        support=SupportStatus(mode=support.mode, warnings=support.warnings),
        objects=objects,
    )
    return document.model_dump(mode="json")


def apply_object_changes(
    spec: dict[str, Any],
    object_id: str,
    changes: dict[str, Any],
) -> dict[str, Any]:
    """Apply an object-scoped mutation and rebuild the document."""
    working = _prepare_editable_spec(spec)

    if object_id == "chart":
        _update_chart(working, changes)
    elif object_id in {"x_axis", "y_axis"}:
        _update_axis(working, object_id[0], changes)
    elif object_id.startswith("legend:"):
        _update_legend(working, object_id.split(":", maxsplit=1)[1], changes)
    elif object_id == "mark_style":
        _update_mark_style(working, changes)
    elif object_id.startswith("annotation:"):
        annotation_id = object_id.split(":", maxsplit=1)[1]
        _update_annotation(working, annotation_id, changes)
    else:
        raise EditorError(f"Unknown editor object '{object_id}'.")

    working = _rebuild_annotation_layers(working)
    _validate_spec(working)
    return build_document(working)


def add_text_annotation(
    spec: dict[str, Any],
    *,
    text: str,
    x: Any,
    y: Any,
    color: str,
    font_size: int,
    align: str,
) -> dict[str, Any]:
    """Append a text annotation to the editor-authored layer set."""
    working = _prepare_editable_spec(spec)
    annotation_id = _next_annotation_id(working)
    _editor_annotations(working).append(
        {
            "id": annotation_id,
            "kind": "text",
            "config": {
                "text": text.strip(),
                "x": _coerce_scalar(x),
                "y": _coerce_scalar(y),
                "color": color.strip() or "#d94841",
                "font_size": int(font_size),
                "align": _coerce_enum(align, {"left", "center", "right"}, "align"),
            },
        }
    )
    working = _rebuild_annotation_layers(working)
    _validate_spec(working)
    return build_document(working)


def add_rule_annotation(
    spec: dict[str, Any],
    *,
    axis: str,
    value: Any,
    label: str,
    color: str,
    stroke_width: float,
    label_color: str,
    label_font_size: int,
) -> dict[str, Any]:
    """Append a rule annotation to the editor-authored layer set."""
    working = _prepare_editable_spec(spec)
    annotation_id = _next_annotation_id(working)
    _editor_annotations(working).append(
        {
            "id": annotation_id,
            "kind": "rule",
            "config": {
                "axis": _coerce_enum(axis, {"x", "y"}, "axis"),
                "value": _coerce_scalar(value),
                "label": label.strip(),
                "color": color.strip() or "#d94841",
                "stroke_width": float(stroke_width),
                "label_color": label_color.strip() or color.strip() or "#d94841",
                "label_font_size": int(label_font_size),
            },
        }
    )
    working = _rebuild_annotation_layers(working)
    _validate_spec(working)
    return build_document(working)


def _prepare_editable_spec(spec: dict[str, Any]) -> dict[str, Any]:
    working = copy.deepcopy(spec)
    working.setdefault("$schema", SCHEMA_URL)

    support = _analyze_support(working)
    if support.mode is not SupportMode.editable:
        reason = support.warnings[0] if support.warnings else "This chart is read-only."
        raise EditorError(reason)

    working = _ensure_editor_metadata(working)
    return _rebuild_annotation_layers(working)


def _analyze_support(spec: dict[str, Any]) -> SupportAnalysis:
    warnings: list[str] = []

    for key in READ_ONLY_COMPOSITION_KEYS:
        if key in spec:
            warnings.append(
                "Facet, concat, repeat, and other composed layouts are preview-only in this MVP."
            )
            return SupportAnalysis(mode=SupportMode.read_only, warnings=warnings)

    if "layer" in spec:
        if not _is_editor_layered_spec(spec):
            warnings.append(
                "Externally authored layered charts are preview-only in this MVP."
            )
            return SupportAnalysis(mode=SupportMode.read_only, warnings=warnings)
        base_view = spec["layer"][0]
    else:
        base_view = spec

    if not isinstance(base_view, dict):
        warnings.append("The base chart is malformed and cannot be edited.")
        return SupportAnalysis(mode=SupportMode.read_only, warnings=warnings)

    if "params" in base_view:
        warnings.append(
            "Parameter-driven interactivity is preview-only in this MVP."
        )
        return SupportAnalysis(mode=SupportMode.read_only, warnings=warnings)

    mark_type = _get_mark_type(base_view)
    if not mark_type:
        warnings.append("The chart does not contain a Vega-Lite mark definition.")
        return SupportAnalysis(mode=SupportMode.read_only, warnings=warnings)
    if mark_type not in SUPPORTED_MARK_TYPES:
        warnings.append(
            f"Mark type '{mark_type}' is outside the supported Stage A subset."
        )
        return SupportAnalysis(mode=SupportMode.read_only, warnings=warnings)

    return SupportAnalysis(mode=SupportMode.editable, warnings=warnings)


def _build_objects(spec: dict[str, Any]) -> list[ObjectDescriptor]:
    objects = [_build_chart_object(spec)]
    base_view = _base_view(spec)
    encoding = base_view.get("encoding", {})

    for channel in AXIS_CHANNELS:
        channel_def = encoding.get(channel)
        if _is_field_channel(channel_def):
            objects.append(_build_axis_object(channel, channel_def))

    for channel in LEGEND_CHANNELS:
        channel_def = encoding.get(channel)
        if _is_field_channel(channel_def) and channel_def.get("legend", True) is not None:
            objects.append(_build_legend_object(channel, channel_def))

    objects.append(_build_mark_style_object(base_view))
    objects.extend(_build_annotation_objects(spec))
    return objects


def _build_chart_object(spec: dict[str, Any]) -> ObjectDescriptor:
    title = spec.get("title")
    title_text = ""
    subtitle_text = ""
    if isinstance(title, str):
        title_text = title
    elif isinstance(title, dict):
        title_text = str(title.get("text", "") or "")
        subtitle = title.get("subtitle")
        if isinstance(subtitle, list):
            subtitle_text = " ".join(str(part) for part in subtitle if part)
        else:
            subtitle_text = str(subtitle or "")

    return ObjectDescriptor(
        id="chart",
        kind="chart",
        label="Chart",
        description="Top-level presentation settings for the current chart.",
        fields=[
            FieldDescriptor(
                name="title_text",
                label="Title",
                control="text",
                value=title_text,
                placeholder="Add a chart title",
            ),
            FieldDescriptor(
                name="subtitle_text",
                label="Subtitle",
                control="text",
                value=subtitle_text,
                placeholder="Optional subtitle",
            ),
            FieldDescriptor(
                name="width",
                label="Width",
                control="number",
                value=spec.get("width"),
                min=120,
                max=1600,
                step=1,
            ),
            FieldDescriptor(
                name="height",
                label="Height",
                control="number",
                value=spec.get("height"),
                min=120,
                max=1200,
                step=1,
            ),
            FieldDescriptor(
                name="background",
                label="Background",
                control="text",
                value=spec.get("background", ""),
                placeholder="#f7f4ee or white",
            ),
            FieldDescriptor(
                name="padding",
                label="Padding",
                control="number",
                value=spec.get("padding"),
                min=0,
                max=80,
                step=1,
            ),
        ],
    )


def _build_axis_object(channel: str, channel_def: dict[str, Any]) -> ObjectDescriptor:
    axis = channel_def.get("axis") or {}
    label = "X Axis" if channel == "x" else "Y Axis"
    return ObjectDescriptor(
        id=f"{channel}_axis",
        kind="axis",
        label=label,
        description="Axis labels, formatting, and visibility controls.",
        fields=[
            FieldDescriptor(
                name="title",
                label="Title",
                control="text",
                value="" if axis.get("title") is None else axis.get("title", ""),
                placeholder="Blank keeps the inferred title",
            ),
            FieldDescriptor(
                name="format",
                label="Format",
                control="text",
                value=axis.get("format", ""),
                placeholder="Example: ~s, .2f",
            ),
            FieldDescriptor(
                name="label_font_size",
                label="Label Font Size",
                control="number",
                value=axis.get("labelFontSize"),
                min=8,
                max=48,
                step=1,
            ),
            FieldDescriptor(
                name="title_font_size",
                label="Title Font Size",
                control="number",
                value=axis.get("titleFontSize"),
                min=8,
                max=56,
                step=1,
            ),
            FieldDescriptor(
                name="ticks",
                label="Show Ticks",
                control="checkbox",
                value=axis.get("ticks", True),
            ),
            FieldDescriptor(
                name="grid",
                label="Show Grid",
                control="checkbox",
                value=axis.get("grid", channel == "y"),
            ),
            FieldDescriptor(
                name="domain",
                label="Show Domain Line",
                control="checkbox",
                value=axis.get("domain", True),
            ),
        ],
    )


def _build_legend_object(channel: str, channel_def: dict[str, Any]) -> ObjectDescriptor:
    legend = channel_def.get("legend") or {}
    return ObjectDescriptor(
        id=f"legend:{channel}",
        kind="legend",
        label=f"{channel.title()} Legend",
        description="Legend title, placement, and typography controls.",
        fields=[
            FieldDescriptor(
                name="title",
                label="Title",
                control="text",
                value="" if legend.get("title") is None else legend.get("title", ""),
                placeholder="Blank keeps the inferred title",
            ),
            FieldDescriptor(
                name="orient",
                label="Placement",
                control="select",
                value=legend.get("orient", "right"),
                options=[
                    SelectOption(label="Left", value="left"),
                    SelectOption(label="Right", value="right"),
                    SelectOption(label="Top", value="top"),
                    SelectOption(label="Bottom", value="bottom"),
                ],
            ),
            FieldDescriptor(
                name="label_font_size",
                label="Label Font Size",
                control="number",
                value=legend.get("labelFontSize"),
                min=8,
                max=48,
                step=1,
            ),
            FieldDescriptor(
                name="title_font_size",
                label="Title Font Size",
                control="number",
                value=legend.get("titleFontSize"),
                min=8,
                max=56,
                step=1,
            ),
            FieldDescriptor(
                name="symbol_size",
                label="Symbol Size",
                control="number",
                value=legend.get("symbolSize"),
                min=20,
                max=600,
                step=5,
            ),
        ],
    )


def _build_mark_style_object(base_view: dict[str, Any]) -> ObjectDescriptor:
    mark = _mark_dict(base_view)
    has_semantic_color = "color" in (base_view.get("encoding") or {})
    mark_type = _get_mark_type(base_view) or "mark"
    width_label = "Line Width" if mark_type in {"line", "rule"} else "Stroke Width"

    fields = [
        FieldDescriptor(
            name="color",
            label="Fill Color",
            control="text",
            value=mark.get("color", ""),
            placeholder="#4c78a8",
            disabled=has_semantic_color,
            help_text=(
                "Disabled because the chart already uses a semantic color encoding."
                if has_semantic_color
                else "Applies a static mark color."
            ),
        ),
        FieldDescriptor(
            name="stroke",
            label="Stroke Color",
            control="text",
            value=mark.get("stroke", ""),
            placeholder="#1f2933",
        ),
        FieldDescriptor(
            name="opacity",
            label="Opacity",
            control="number",
            value=mark.get("opacity"),
            min=0,
            max=1,
            step=0.05,
        ),
        FieldDescriptor(
            name="stroke_width",
            label=width_label,
            control="number",
            value=mark.get("strokeWidth"),
            min=0,
            max=24,
            step=0.5,
        ),
        FieldDescriptor(
            name="size",
            label="Mark Size",
            control="number",
            value=mark.get("size"),
            min=0,
            max=1000,
            step=1,
        ),
    ]

    return ObjectDescriptor(
        id="mark_style",
        kind="mark_style",
        label="Mark Style",
        description="Static mark-level styling properties for the base chart.",
        fields=fields,
    )


def _build_annotation_objects(spec: dict[str, Any]) -> list[ObjectDescriptor]:
    objects: list[ObjectDescriptor] = []
    for annotation in _editor_annotations(spec):
        annotation_id = annotation["id"]
        config = annotation["config"]
        if annotation["kind"] == "text":
            objects.append(
                ObjectDescriptor(
                    id=f"annotation:{annotation_id}",
                    kind="annotation_text",
                    label=f"Annotation {annotation_id}",
                    description="Editor-authored text annotation anchored in data space.",
                    fields=[
                        FieldDescriptor(
                            name="text",
                            label="Text",
                            control="text",
                            value=config.get("text", ""),
                        ),
                        FieldDescriptor(
                            name="x",
                            label="X Value",
                            control="text",
                            value=str(config.get("x", "")),
                        ),
                        FieldDescriptor(
                            name="y",
                            label="Y Value",
                            control="text",
                            value=str(config.get("y", "")),
                        ),
                        FieldDescriptor(
                            name="color",
                            label="Color",
                            control="text",
                            value=config.get("color", ""),
                            placeholder="#d94841",
                        ),
                        FieldDescriptor(
                            name="font_size",
                            label="Font Size",
                            control="number",
                            value=config.get("font_size", 14),
                            min=8,
                            max=72,
                            step=1,
                        ),
                        FieldDescriptor(
                            name="align",
                            label="Alignment",
                            control="select",
                            value=config.get("align", "left"),
                            options=[
                                SelectOption(label="Left", value="left"),
                                SelectOption(label="Center", value="center"),
                                SelectOption(label="Right", value="right"),
                            ],
                        ),
                    ],
                )
            )
        else:
            objects.append(
                ObjectDescriptor(
                    id=f"annotation:{annotation_id}",
                    kind="annotation_rule",
                    label=f"Reference {annotation_id}",
                    description="Editor-authored reference line with an optional label.",
                    fields=[
                        FieldDescriptor(
                            name="axis",
                            label="Axis",
                            control="select",
                            value=config.get("axis", "y"),
                            options=[
                                SelectOption(label="Vertical (x)", value="x"),
                                SelectOption(label="Horizontal (y)", value="y"),
                            ],
                        ),
                        FieldDescriptor(
                            name="value",
                            label="Value",
                            control="text",
                            value=str(config.get("value", "")),
                        ),
                        FieldDescriptor(
                            name="label",
                            label="Label",
                            control="text",
                            value=config.get("label", ""),
                            placeholder="Optional label",
                        ),
                        FieldDescriptor(
                            name="color",
                            label="Line Color",
                            control="text",
                            value=config.get("color", ""),
                            placeholder="#d94841",
                        ),
                        FieldDescriptor(
                            name="stroke_width",
                            label="Line Width",
                            control="number",
                            value=config.get("stroke_width", 2.0),
                            min=0.5,
                            max=12,
                            step=0.5,
                        ),
                        FieldDescriptor(
                            name="label_color",
                            label="Label Color",
                            control="text",
                            value=config.get("label_color", ""),
                            placeholder="#d94841",
                        ),
                        FieldDescriptor(
                            name="label_font_size",
                            label="Label Font Size",
                            control="number",
                            value=config.get("label_font_size", 12),
                            min=8,
                            max=72,
                            step=1,
                        ),
                    ],
                )
            )
    return objects


def _update_chart(spec: dict[str, Any], changes: dict[str, Any]) -> None:
    title_text = _coerce_optional_text(changes.get("title_text"))
    subtitle_text = _coerce_optional_text(changes.get("subtitle_text"))

    if title_text or subtitle_text:
        title: dict[str, Any] = {}
        if title_text:
            title["text"] = title_text
        if subtitle_text:
            title["subtitle"] = subtitle_text
        spec["title"] = title
    else:
        spec.pop("title", None)

    _set_numeric_optional(spec, "width", changes.get("width"), minimum=120)
    _set_numeric_optional(spec, "height", changes.get("height"), minimum=120)
    _set_numeric_optional(spec, "padding", changes.get("padding"), minimum=0)

    background = _coerce_optional_text(changes.get("background"))
    if background:
        spec["background"] = background
    else:
        spec.pop("background", None)


def _update_axis(spec: dict[str, Any], channel: str, changes: dict[str, Any]) -> None:
    base_view = _mutable_base_view(spec)
    channel_def = _channel_definition(base_view, channel)
    axis = dict(channel_def.get("axis") or {})

    if "title" in changes:
        title = _coerce_optional_text(changes["title"])
        axis["title"] = title if title is not None else None
    if "format" in changes:
        fmt = _coerce_optional_text(changes["format"])
        if fmt:
            axis["format"] = fmt
        else:
            axis.pop("format", None)
    if "label_font_size" in changes:
        _set_numeric_optional(axis, "labelFontSize", changes["label_font_size"], minimum=8)
    if "title_font_size" in changes:
        _set_numeric_optional(axis, "titleFontSize", changes["title_font_size"], minimum=8)
    if "ticks" in changes:
        axis["ticks"] = _coerce_bool(changes["ticks"])
    if "grid" in changes:
        axis["grid"] = _coerce_bool(changes["grid"])
    if "domain" in changes:
        axis["domain"] = _coerce_bool(changes["domain"])

    channel_def["axis"] = axis


def _update_legend(spec: dict[str, Any], channel: str, changes: dict[str, Any]) -> None:
    base_view = _mutable_base_view(spec)
    channel_def = _channel_definition(base_view, channel)
    legend = dict(channel_def.get("legend") or {})

    if "title" in changes:
        title = _coerce_optional_text(changes["title"])
        legend["title"] = title if title is not None else None
    if "orient" in changes:
        legend["orient"] = _coerce_enum(
            changes["orient"],
            {"left", "right", "top", "bottom"},
            "orient",
        )
    if "label_font_size" in changes:
        _set_numeric_optional(legend, "labelFontSize", changes["label_font_size"], minimum=8)
    if "title_font_size" in changes:
        _set_numeric_optional(legend, "titleFontSize", changes["title_font_size"], minimum=8)
    if "symbol_size" in changes:
        _set_numeric_optional(legend, "symbolSize", changes["symbol_size"], minimum=20)

    channel_def["legend"] = legend


def _update_mark_style(spec: dict[str, Any], changes: dict[str, Any]) -> None:
    base_view = _mutable_base_view(spec)
    mark = _mark_dict(base_view)

    if "color" in changes:
        color = _coerce_optional_text(changes["color"])
        if color:
            if "color" in (base_view.get("encoding") or {}):
                raise EditorError(
                    "Static mark color cannot be set while a semantic color encoding is active."
                )
            mark["color"] = color
        else:
            mark.pop("color", None)

    if "stroke" in changes:
        stroke = _coerce_optional_text(changes["stroke"])
        if stroke:
            mark["stroke"] = stroke
        else:
            mark.pop("stroke", None)

    if "opacity" in changes:
        _set_numeric_optional(mark, "opacity", changes["opacity"], minimum=0, maximum=1)
    if "stroke_width" in changes:
        _set_numeric_optional(mark, "strokeWidth", changes["stroke_width"], minimum=0)
    if "size" in changes:
        _set_numeric_optional(mark, "size", changes["size"], minimum=0)

    base_view["mark"] = mark


def _update_annotation(spec: dict[str, Any], annotation_id: str, changes: dict[str, Any]) -> None:
    annotation = _find_annotation(spec, annotation_id)
    config = annotation["config"]

    if annotation["kind"] == "text":
        if "text" in changes:
            config["text"] = _coerce_optional_text(changes["text"]) or ""
        if "x" in changes:
            config["x"] = _coerce_scalar(changes["x"])
        if "y" in changes:
            config["y"] = _coerce_scalar(changes["y"])
        if "color" in changes:
            config["color"] = _coerce_optional_text(changes["color"]) or "#d94841"
        if "font_size" in changes:
            config["font_size"] = int(_coerce_number(changes["font_size"], minimum=8))
        if "align" in changes:
            config["align"] = _coerce_enum(
                changes["align"],
                {"left", "center", "right"},
                "align",
            )
    else:
        if "axis" in changes:
            config["axis"] = _coerce_enum(changes["axis"], {"x", "y"}, "axis")
        if "value" in changes:
            config["value"] = _coerce_scalar(changes["value"])
        if "label" in changes:
            config["label"] = _coerce_optional_text(changes["label"]) or ""
        if "color" in changes:
            config["color"] = _coerce_optional_text(changes["color"]) or "#d94841"
        if "stroke_width" in changes:
            config["stroke_width"] = float(
                _coerce_number(changes["stroke_width"], minimum=0.5)
            )
        if "label_color" in changes:
            config["label_color"] = _coerce_optional_text(changes["label_color"]) or "#d94841"
        if "label_font_size" in changes:
            config["label_font_size"] = int(
                _coerce_number(changes["label_font_size"], minimum=8)
            )


def _rebuild_annotation_layers(spec: dict[str, Any]) -> dict[str, Any]:
    editor = _editor_meta(spec)
    annotations = editor["annotations"]

    if not annotations:
        if _is_editor_layered_spec(spec):
            return _merge_top_level_into_base(_base_view(spec), spec)
        return spec

    wrapped = _layer_wrapper(spec)
    wrapped["layer"] = [_base_view(spec)]
    for annotation in annotations:
        wrapped["layer"].extend(_build_annotation_layers(annotation))
    return wrapped


def _build_annotation_layers(annotation: dict[str, Any]) -> list[dict[str, Any]]:
    config = annotation["config"]
    if annotation["kind"] == "text":
        return [
            {
                "mark": {
                    "type": "text",
                    "align": config["align"],
                    "baseline": "bottom",
                    "color": config["color"],
                    "fontSize": config["font_size"],
                },
                "encoding": {
                    "x": {"datum": config["x"]},
                    "y": {"datum": config["y"]},
                    "text": {"datum": config["text"]},
                },
            }
        ]

    axis = config["axis"]
    value = config["value"]
    color = config["color"]
    stroke_width = config["stroke_width"]
    layers = [
        {
            "mark": {"type": "rule", "color": color, "strokeWidth": stroke_width},
            "encoding": {axis: {"datum": value}},
        }
    ]

    label = config["label"]
    if label:
        if axis == "y":
            label_layer = {
                "mark": {
                    "type": "text",
                    "align": "left",
                    "baseline": "bottom",
                    "dx": 8,
                    "dy": -4,
                    "color": config["label_color"],
                    "fontSize": config["label_font_size"],
                },
                "encoding": {
                    "x": {"value": 8},
                    "y": {"datum": value},
                    "text": {"datum": label},
                },
            }
        else:
            label_layer = {
                "mark": {
                    "type": "text",
                    "align": "left",
                    "baseline": "top",
                    "dx": 4,
                    "dy": 4,
                    "color": config["label_color"],
                    "fontSize": config["label_font_size"],
                },
                "encoding": {
                    "x": {"datum": value},
                    "y": {"value": 12},
                    "text": {"datum": label},
                },
            }
        layers.append(label_layer)

    return layers


def _ensure_editor_metadata(spec: dict[str, Any]) -> dict[str, Any]:
    spec.setdefault("$schema", SCHEMA_URL)
    usermeta = spec.setdefault("usermeta", {})
    editor = usermeta.setdefault("editor", {})
    editor.setdefault("version", EDITOR_VERSION)
    editor.setdefault("origin", "loaded")
    editor.setdefault("annotation_counter", 0)
    editor.setdefault("annotations", [])
    return spec


def _editor_meta(spec: dict[str, Any]) -> dict[str, Any]:
    return _ensure_editor_metadata(spec)["usermeta"]["editor"]


def _editor_annotations(spec: dict[str, Any]) -> list[dict[str, Any]]:
    annotations = _editor_meta(spec)["annotations"]
    if not isinstance(annotations, list):
        raise EditorError("The editor metadata is malformed.")
    return annotations


def _find_annotation(spec: dict[str, Any], annotation_id: str) -> dict[str, Any]:
    for annotation in _editor_annotations(spec):
        if annotation["id"] == annotation_id:
            return annotation
    raise EditorError(f"Unknown annotation '{annotation_id}'.")


def _next_annotation_id(spec: dict[str, Any]) -> str:
    editor = _editor_meta(spec)
    counter = int(editor.get("annotation_counter", 0)) + 1
    editor["annotation_counter"] = counter
    return f"annotation-{counter}"


def _is_editor_layered_spec(spec: dict[str, Any]) -> bool:
    layer = spec.get("layer")
    editor = spec.get("usermeta", {}).get("editor", {})
    return isinstance(layer, list) and len(layer) >= 1 and editor.get("version") == EDITOR_VERSION


def _base_view(spec: dict[str, Any]) -> dict[str, Any]:
    if _is_editor_layered_spec(spec):
        return copy.deepcopy(spec["layer"][0])
    return {
        key: copy.deepcopy(value)
        for key, value in spec.items()
        if key not in LAYER_WRAPPER_KEYS and key != "layer"
    }


def _mutable_base_view(spec: dict[str, Any]) -> dict[str, Any]:
    if _is_editor_layered_spec(spec):
        return spec["layer"][0]
    return spec


def _layer_wrapper(spec: dict[str, Any]) -> dict[str, Any]:
    wrapper = {
        key: copy.deepcopy(value)
        for key, value in spec.items()
        if key in LAYER_WRAPPER_KEYS
    }
    wrapper["$schema"] = wrapper.get("$schema", SCHEMA_URL)
    wrapper["usermeta"] = copy.deepcopy(spec.get("usermeta", {}))
    return wrapper


def _merge_top_level_into_base(base_view: dict[str, Any], layered_spec: dict[str, Any]) -> dict[str, Any]:
    merged = copy.deepcopy(base_view)
    for key in LAYER_WRAPPER_KEYS:
        if key in layered_spec:
            merged[key] = copy.deepcopy(layered_spec[key])
    merged["$schema"] = merged.get("$schema", SCHEMA_URL)
    return merged


def _channel_definition(base_view: dict[str, Any], channel: str) -> dict[str, Any]:
    encoding = base_view.get("encoding")
    if not isinstance(encoding, dict) or channel not in encoding:
        raise EditorError(f"The chart does not expose an editable '{channel}' channel.")
    channel_def = encoding[channel]
    if not isinstance(channel_def, dict):
        raise EditorError(f"The '{channel}' channel definition is malformed.")
    return channel_def


def _mark_dict(base_view: dict[str, Any]) -> dict[str, Any]:
    mark = base_view.get("mark")
    if isinstance(mark, str):
        return {"type": mark}
    if isinstance(mark, dict):
        return dict(mark)
    raise EditorError("The chart mark definition is malformed.")


def _get_mark_type(base_view: dict[str, Any]) -> str | None:
    mark = base_view.get("mark")
    if isinstance(mark, str):
        return mark
    if isinstance(mark, dict):
        mark_type = mark.get("type")
        return str(mark_type) if isinstance(mark_type, str) else None
    return None


def _is_field_channel(channel_def: Any) -> bool:
    return isinstance(channel_def, dict) and "field" in channel_def


def _set_numeric_optional(
    target: dict[str, Any],
    key: str,
    value: Any,
    *,
    minimum: float | None = None,
    maximum: float | None = None,
) -> None:
    if value is None or value == "":
        target.pop(key, None)
        return
    target[key] = _coerce_number(value, minimum=minimum, maximum=maximum)


def _coerce_number(
    value: Any,
    *,
    minimum: float | None = None,
    maximum: float | None = None,
) -> float:
    try:
        number = float(value)
    except (TypeError, ValueError) as exc:
        raise EditorError(f"Expected a numeric value, received '{value}'.") from exc

    if minimum is not None and number < minimum:
        raise EditorError(f"Expected a value greater than or equal to {minimum}.")
    if maximum is not None and number > maximum:
        raise EditorError(f"Expected a value less than or equal to {maximum}.")
    return int(number) if number.is_integer() else number


def _coerce_bool(value: Any) -> bool:
    if isinstance(value, bool):
        return value
    if isinstance(value, str):
        lowered = value.strip().lower()
        if lowered in {"true", "1", "yes", "on"}:
            return True
        if lowered in {"false", "0", "no", "off"}:
            return False
    raise EditorError(f"Expected a boolean value, received '{value}'.")


def _coerce_optional_text(value: Any) -> str | None:
    if value is None:
        return None
    text = str(value).strip()
    return text or None


def _coerce_enum(value: Any, allowed: set[str], field_name: str) -> str:
    text = _coerce_optional_text(value)
    if text not in allowed:
        allowed_text = ", ".join(sorted(allowed))
        raise EditorError(f"Invalid {field_name}. Expected one of: {allowed_text}.")
    return text


def _coerce_scalar(value: Any) -> Any:
    if isinstance(value, (bool, int, float)):
        return value
    if value is None:
        raise EditorError("Annotation values cannot be empty.")

    text = str(value).strip()
    if not text:
        raise EditorError("Annotation values cannot be empty.")

    try:
        parsed = json.loads(text)
    except json.JSONDecodeError:
        return text

    if isinstance(parsed, (dict, list)):
        raise EditorError("Annotation values must be scalar JSON values.")
    return parsed


def _build_python_snippet(spec: dict[str, Any]) -> str:
    spec_json = json.dumps(spec, indent=2, sort_keys=True)
    return (
        "import altair as alt\n"
        "import json\n\n"
        "spec = json.loads(\n"
        f"    {spec_json!r}\n"
        ")\n\n"
        "chart = alt.Chart.from_dict(spec)\n"
    )


def _render_preview_data_url(spec: dict[str, Any]) -> str:
    try:
        svg = vlc.vegalite_to_svg(spec)
    except Exception as exc:  # pragma: no cover - exercised in integration tests
        raise EditorError("The chart could not be rendered.", details=str(exc)) from exc
    encoded = base64.b64encode(svg.encode("utf-8")).decode("ascii")
    return f"data:image/svg+xml;base64,{encoded}"


def _validate_spec(spec: dict[str, Any]) -> None:
    try:
        alt.Chart.from_dict(spec)
    except Exception as exc:
        raise EditorError("The chart is not valid Vega-Lite.", details=str(exc)) from exc

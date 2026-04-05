"""Shared editor constants."""

SCHEMA_URL = "https://vega.github.io/schema/vega-lite/v5.json"
EDITOR_VERSION = 1

SUPPORTED_MARK_TYPES = {
    "area",
    "bar",
    "circle",
    "line",
    "point",
    "rule",
    "square",
    "text",
}

AXIS_CHANNELS = ("x", "y")
LEGEND_CHANNELS = ("color", "size", "shape")
READ_ONLY_COMPOSITION_KEYS = ("concat", "facet", "hconcat", "repeat", "vconcat")

LAYER_WRAPPER_KEYS = {
    "$schema",
    "autosize",
    "background",
    "bounds",
    "config",
    "datasets",
    "description",
    "padding",
    "resolve",
    "title",
    "usermeta",
    "width",
    "height",
}

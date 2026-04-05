"""Tests for the provenance module."""

from vega_ui.engine.provenance import annotate_spec, get_object_ids, strip_provenance


def test_annotate_adds_editor_block(bar_spec):
    annotated = annotate_spec(bar_spec)
    assert "usermeta" in annotated
    editor = annotated["usermeta"]["editor"]
    assert editor["version"] == 1
    assert "object_ids" in editor


def test_annotate_preserves_spec_content(bar_spec):
    annotated = annotate_spec(bar_spec)
    assert annotated["mark"] == bar_spec["mark"] or annotated["mark"] == bar_spec["mark"]
    assert annotated["encoding"] == bar_spec["encoding"]


def test_annotate_generates_expected_ids(bar_spec):
    annotated = annotate_spec(bar_spec)
    ids = get_object_ids(annotated)
    assert "chart" in ids
    assert "mark" in ids
    assert "encoding-x" in ids
    assert "encoding-y" in ids
    assert "axis-x" in ids
    assert "axis-y" in ids


def test_annotate_generates_legend_ids(line_spec):
    annotated = annotate_spec(line_spec)
    ids = get_object_ids(annotated)
    assert "encoding-color" in ids
    assert "legend-color" in ids


def test_strip_removes_editor_block(bar_spec):
    annotated = annotate_spec(bar_spec)
    stripped = strip_provenance(annotated)
    assert "usermeta" not in stripped


def test_strip_preserves_other_usermeta(bar_spec):
    annotated = annotate_spec(bar_spec)
    annotated["usermeta"]["custom_key"] = "keep_this"
    stripped = strip_provenance(annotated)
    assert stripped["usermeta"]["custom_key"] == "keep_this"
    assert "editor" not in stripped["usermeta"]


def test_annotate_idempotent(bar_spec):
    first = annotate_spec(bar_spec)
    second = annotate_spec(first)
    assert get_object_ids(first) == get_object_ids(second)


def test_annotate_does_not_mutate_original(bar_spec):
    original_keys = set(bar_spec.keys())
    annotate_spec(bar_spec)
    assert set(bar_spec.keys()) == original_keys


def test_get_object_ids_empty_on_unannotated(bar_spec):
    assert get_object_ids(bar_spec) == {}

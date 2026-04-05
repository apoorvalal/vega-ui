# Vega UI

Vega UI is a Stage A MVP for visually editing a constrained subset of Vega-Lite charts that typically originate from Altair. The current implementation is deliberately conservative: it prioritizes spec safety, deterministic exports, and a fast local setup over broad Vega-Lite coverage or speculative scenegraph hit-testing.

The app lets a user:

- load a Vega-Lite spec from a textarea,
- preview the chart as an SVG rendered server-side,
- edit supported chart, axis, legend, mark-style, and annotation properties,
- add editor-authored text annotations and reference lines,
- export normalized Vega-Lite JSON,
- export a robust Python fallback using `alt.Chart.from_dict(spec)`.

The code is intentionally scoped to the part of the original spec that is practical to build and harden first: Stage A presentation editing with explicit read-only fallbacks for unsupported chart structures.

## Why This Stack

I chose a Python-first stack with no Node or bundler dependency:

- `FastAPI` provides a small, testable HTTP surface for loading specs, applying mutations, and returning rebuilt editor state.
- `Jinja2` serves a thin HTML shell, while the actual interaction logic lives in a small static JavaScript file.
- `Altair` is used as the schema-aware validation boundary and as the Python export target for the `from_dict` fallback.
- `vl-convert-python` renders Vega-Lite specs to SVG on the server. This avoids a frontend Vega runtime, keeps the setup simple, and makes the preview deterministic in tests.

This is not a full click-on-chart WYSIWYG editor yet. The current UI is structure-first rather than scenegraph-first:

- the preview is visual,
- the object selection model comes from a supported object list,
- mutations are driven by explicit property panels,
- unsupported specs remain preview-only.

That choice is intentional. The earlier spec review identified scenegraph hit-testing as the largest unresolved technical risk. This MVP avoids pretending that problem is solved.

## Current Scope

### Supported inputs

The app treats these as editable:

- single-view Vega-Lite charts,
- supported mark types: `bar`, `line`, `point`, `area`, `text`, `rule`, `circle`, `square`,
- charts without parameter-driven interactivity,
- charts that become layered only through editor-authored annotations.

The app treats these as preview-only:

- externally authored layered charts,
- facet, repeat, concat, hconcat, and vconcat layouts,
- complex interactive specs with `params`,
- anything outside the declared Stage A subset.

Preview-only means:

- the chart still loads,
- the SVG still renders,
- the user still gets JSON and Python exports,
- mutations and annotation controls are disabled,
- the UI explains why the chart is read-only.

### Supported edits

The editable object model currently includes:

- `chart`
  - title
  - subtitle
  - width
  - height
  - background
  - padding
- `x_axis` and `y_axis`
  - title
  - format string
  - label font size
  - title font size
  - tick visibility
  - grid visibility
  - domain line visibility
- `legend:<channel>`
  - title
  - orient
  - label font size
  - title font size
  - symbol size
- `mark_style`
  - static fill color when the chart does not already use a semantic color encoding
  - stroke color
  - opacity
  - stroke width
  - size
- `annotation:<id>`
  - text annotations anchored in data space
  - rule annotations with optional labels

### Supported outputs

Every successful mutation returns:

- the updated Vega-Lite spec as JSON,
- a rendered SVG preview encoded as a data URL,
- a Python fallback snippet:

```python
import altair as alt
import json

spec = json.loads("...")
chart = alt.Chart.from_dict(spec)
```

The Python fallback is the guaranteed contract in this MVP. The app does not attempt normalized hand-written Altair regeneration yet.

## Implementation Notes

### Package layout

The implementation lives in [`src/vega_ui_app`](/home/alal/Desktop/code/viz/vega-ui/src/vega_ui_app).

That package name is deliberate. There is an unrelated top-level [`vega_ui`](/home/alal/Desktop/code/viz/vega-ui/vega_ui) tree in the workspace that would shadow a normal `vega_ui` package import. Using `vega_ui_app` keeps the app isolated and avoids modifying workspace files that were not part of this implementation.

Key files:

- [`src/vega_ui_app/app.py`](/home/alal/Desktop/code/viz/vega-ui/src/vega_ui_app/app.py)
  - FastAPI application and route registration
- [`src/vega_ui_app/editor.py`](/home/alal/Desktop/code/viz/vega-ui/src/vega_ui_app/editor.py)
  - support analysis
  - mutation engine
  - annotation rebuild logic
  - preview rendering
  - export generation
- [`src/vega_ui_app/examples.py`](/home/alal/Desktop/code/viz/vega-ui/src/vega_ui_app/examples.py)
  - seeded example spec used by the UI
- [`src/vega_ui_app/models.py`](/home/alal/Desktop/code/viz/vega-ui/src/vega_ui_app/models.py)
  - request and response models
- [`src/vega_ui_app/templates/index.html`](/home/alal/Desktop/code/viz/vega-ui/src/vega_ui_app/templates/index.html)
  - server-rendered page shell
- [`src/vega_ui_app/static/app.js`](/home/alal/Desktop/code/viz/vega-ui/src/vega_ui_app/static/app.js)
  - browser-side state management
- [`src/vega_ui_app/static/styles.css`](/home/alal/Desktop/code/viz/vega-ui/src/vega_ui_app/static/styles.css)
  - responsive layout and visual styling
- [`tests/test_editor.py`](/home/alal/Desktop/code/viz/vega-ui/tests/test_editor.py)
  - mutation engine coverage
- [`tests/test_app.py`](/home/alal/Desktop/code/viz/vega-ui/tests/test_app.py)
  - API coverage

### Data flow

The request flow is stateless and server-driven:

1. The browser sends either a raw spec string or the current spec plus a mutation payload.
2. The backend validates the incoming spec with Altair.
3. The backend determines whether the spec is editable or preview-only.
4. For editable specs, the backend normalizes editor metadata and, if needed, rebuilds annotation layers.
5. The backend applies the mutation.
6. The backend validates the mutated spec again.
7. The backend renders an SVG preview with `vl-convert-python`.
8. The backend returns the full rebuilt document.

This approach makes the browser simple and keeps the validation boundary in one place.

### Annotation model

Annotations are metadata-driven rather than patched directly into the layer list.

The app stores editor-authored annotations in:

```json
{
  "usermeta": {
    "editor": {
      "version": 1,
      "annotation_counter": 2,
      "annotations": [
        {
          "id": "annotation-1",
          "kind": "text",
          "config": {
            "text": "Target",
            "x": "Q3",
            "y": 188,
            "color": "#d94841",
            "font_size": 14,
            "align": "left"
          }
        }
      ]
    }
  }
}
```

The visible annotation layers are rebuilt from that metadata on every edit. This keeps annotation mutations deterministic and avoids trying to infer ownership from arbitrary layer structures.

Design choices:

- text annotations are anchored in data space using `datum`,
- rule annotations are data-space rules with optional label layers,
- labels for rules use simple fixed view offsets so they stay readable.

## Running the App

### Prerequisites

- Python 3.11 or newer
- `uv`

The repo already includes a `.python-version` pinned to Python 3.11.

### One-time setup

From the repo root:

```bash
uv sync
```

That will:

- create or update `.venv`,
- install application dependencies,
- install dev dependencies,
- install the local package in editable mode.

### Start the development server

Either of these commands works:

```bash
uv run vega-ui --reload
```

```bash
uv run python main.py --reload
```

By default the app binds to `127.0.0.1:8000`.

Open:

```text
http://127.0.0.1:8000
```

### CLI options

```bash
uv run vega-ui --help
```

Supported options:

- `--host`
- `--port`
- `--reload`

Examples:

```bash
uv run vega-ui --host 0.0.0.0 --port 9000 --reload
```

```bash
uv run python -m vega_ui_app --reload
```

## Running Tests

Run the full suite:

```bash
uv run pytest
```

Current coverage focus:

- editable versus read-only support gating,
- chart mutation correctness,
- axis and legend mutation correctness,
- semantic color override protection,
- annotation creation and update behavior,
- HTTP endpoint behavior for load, mutate, and annotation routes.

## HTTP API

### `GET /api/example`

Returns the seeded example document the UI loads on startup.

### `POST /api/load`

Request body:

```json
{
  "spec_text": "{ ... raw Vega-Lite JSON ... }"
}
```

Response:

- `spec`
- `spec_json`
- `python_code`
- `preview_data_url`
- `support`
- `objects`

### `POST /api/mutate`

Request body:

```json
{
  "spec": { "...": "current spec" },
  "object_id": "chart",
  "changes": {
    "title_text": "Updated title"
  }
}
```

The server applies the mutation, validates the result, rerenders the preview, and returns the full rebuilt document.

### `POST /api/annotations/text`

Adds a data-space text annotation.

Request body:

```json
{
  "spec": { "...": "current spec" },
  "text": "Target",
  "x": "Q3",
  "y": 188,
  "color": "#d94841",
  "font_size": 14,
  "align": "left"
}
```

### `POST /api/annotations/rule`

Adds a reference line with an optional label.

Request body:

```json
{
  "spec": { "...": "current spec" },
  "axis": "y",
  "value": 180,
  "label": "Goal line",
  "color": "#d94841",
  "stroke_width": 2,
  "label_color": "#d94841",
  "label_font_size": 12
}
```

## Hardening Decisions

The MVP already includes a few defensive measures that matter for a chart editor:

- Unsupported structures fail closed.
  - The app renders them but does not let the user mutate them.
- All mutations revalidate the resulting Vega-Lite spec with Altair.
- The preview is returned as a base64-encoded SVG data URL rather than injected as raw inline SVG.
- The server is stateless.
  - Every request carries the current spec, so there is no hidden session state to corrupt.
- Annotation layers are rebuilt from metadata rather than patched in place.
- The mark-style editor blocks static fill-color overrides when the chart already has a semantic `encoding.color`.
- Errors are surfaced as structured 400 responses with human-readable detail.

## Intentional Limitations

This is still a constrained Stage A implementation. It does not yet do:

- scenegraph hit-testing on the preview,
- click-to-select on rendered chart elements,
- arbitrary external layered chart editing,
- semantic channel remapping,
- transform editing,
- normalized Altair code generation beyond `from_dict`,
- drag handles for annotations,
- browser automation tests.

Those are real next steps, but they require more precise ownership and ambiguity rules than this MVP tries to claim.

## Recommended Next Work

If you continue from here, the highest-value next tasks are:

1. Add a formal support matrix to the UI so users can see why a chart is read-only before trying to edit it.
2. Expand the object model to include more explicit chart title and subtitle styling rather than folding them into the chart object.
3. Add deletion and reordering for editor-authored annotations.
4. Introduce a stricter provenance block so future normalized Altair generation has a cleaner starting point.
5. Add browser tests for the selection panel, property forms, and export actions.
6. Decide whether the next milestone is scenegraph selection or a richer structure navigator.

## Quick Start Summary

If you only need the shortest path:

```bash
uv sync
uv run vega-ui --reload
```

Then open `http://127.0.0.1:8000`, load the example chart, edit the object properties in the left column, and download the JSON or Python export from the right column.

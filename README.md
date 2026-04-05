# Vega UI

Vega UI is a small web editor for the presentation layer of Vega-Lite and Altair charts.

Deployed app: [lalten.org/vega-ui](https://lalten.org/vega-ui/)

## Problem

Altair and Vega-Lite are great for generating charts, but small visual edits after the fact are still awkward. If you want to tweak a title, resize a chart, restyle marks, adjust axes, or add a lightweight annotation, you usually end up hand-editing JSON or Python for changes that should feel direct.

This project is for that last-mile editing step.

## How It Works

The app keeps Vega-Lite as the source of truth and puts a thin Python UI on top of it.

- FastHTML renders the editor UI
- FastAPI exposes the JSON API
- the Python mutation engine applies constrained chart edits
- `vl-convert-python` renders server-side SVG previews

The goal is not a full chart authoring system. The goal is to take an existing Vega-Lite or Altair chart and make presentation edits quickly.

## Starter Plot From Altair

One simple workflow is:

1. build a chart in Altair
2. print the Vega-Lite JSON
3. paste that JSON into Vega UI
4. edit the chart in the browser

Example:

```python
import altair as alt
from altair.datasets import data

cars = data.cars()

chart = (
    alt.Chart(cars)
    .mark_point()
    .encode(
        x="Horsepower",
        y="Miles_per_Gallon",
        color="Origin",
    )
    .interactive()
)

print(chart.to_json(indent=2))
```

Then:

1. run the script
2. copy the printed JSON
3. open [lalten.org/vega-ui](https://lalten.org/vega-ui/)
4. paste the JSON into the load form
5. click `Create Editing Session`

That gives you a starter scatter plot that you can retitle, resize, restyle, annotate, and export.

## Run Locally

```bash
uv sync
uv run vega-ui
```

Then open `http://127.0.0.1:8000`.

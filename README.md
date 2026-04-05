# Vega UI

Vega UI is a Stage A Vega-Lite / Altair editor split into a Python backend and a TypeScript frontend.

The canonical repository layout is:

- [`vega_ui`](/home/alal/Desktop/code/viz/vega-ui/vega_ui): FastAPI backend, ingestion, validation, provenance, mutation engine, exports, and in-memory session store
- [`frontend`](/home/alal/Desktop/code/viz/vega-ui/frontend): Vite frontend for rendering charts, selection, property panels, annotations, export actions, and client-side state
- [`tests`](/home/alal/Desktop/code/viz/vega-ui/tests): Python backend tests

This repo previously contained a second incompatible implementation under `src/vega_ui_app`. That duplicate stack has been removed so the codebase now matches the tested `vega_ui` + `frontend` architecture.

## What It Does

Current Stage A scope:

- ingest Vega-Lite specs through the backend
- validate and normalize supported charts
- annotate specs with editor provenance
- expose chart sessions over HTTP
- apply constrained presentation-layer mutations
- support add, update, remove, and undo for annotations
- export clean Vega-Lite JSON
- export Python, preferring normalized Altair when possible and falling back to `alt.Chart.from_dict(spec)`

The backend API is centered on chart sessions:

- `POST /api/charts`
- `GET /api/charts/{session_id}`
- `POST /api/charts/{session_id}/mutate`
- `POST /api/charts/{session_id}/undo`
- `POST /api/charts/{session_id}/annotations/add`
- `POST /api/charts/{session_id}/annotations/update`
- `POST /api/charts/{session_id}/annotations/remove`
- `GET /api/charts/{session_id}/export/json`
- `GET /api/charts/{session_id}/export/python`

Key backend files:

- [`vega_ui/app.py`](/home/alal/Desktop/code/viz/vega-ui/vega_ui/app.py)
- [`vega_ui/engine/ingestion.py`](/home/alal/Desktop/code/viz/vega-ui/vega_ui/engine/ingestion.py)
- [`vega_ui/engine/validation.py`](/home/alal/Desktop/code/viz/vega-ui/vega_ui/engine/validation.py)
- [`vega_ui/engine/provenance.py`](/home/alal/Desktop/code/viz/vega-ui/vega_ui/engine/provenance.py)
- [`vega_ui/engine/mutation.py`](/home/alal/Desktop/code/viz/vega-ui/vega_ui/engine/mutation.py)
- [`vega_ui/engine/codegen.py`](/home/alal/Desktop/code/viz/vega-ui/vega_ui/engine/codegen.py)
- [`vega_ui/routes/charts.py`](/home/alal/Desktop/code/viz/vega-ui/vega_ui/routes/charts.py)
- [`vega_ui/routes/mutations.py`](/home/alal/Desktop/code/viz/vega-ui/vega_ui/routes/mutations.py)
- [`vega_ui/routes/export.py`](/home/alal/Desktop/code/viz/vega-ui/vega_ui/routes/export.py)

Key frontend files:

- [`frontend/src/main.ts`](/home/alal/Desktop/code/viz/vega-ui/frontend/src/main.ts)
- [`frontend/src/renderer.ts`](/home/alal/Desktop/code/viz/vega-ui/frontend/src/renderer.ts)
- [`frontend/src/selection.ts`](/home/alal/Desktop/code/viz/vega-ui/frontend/src/selection.ts)
- [`frontend/src/state.ts`](/home/alal/Desktop/code/viz/vega-ui/frontend/src/state.ts)
- [`frontend/src/panel/panel.ts`](/home/alal/Desktop/code/viz/vega-ui/frontend/src/panel/panel.ts)

## Setup

Python:

```bash
uv sync
```

Frontend:

```bash
cd frontend
npm install
```

`frontend/node_modules` is intentionally ignored and should not be committed.

## Run

Backend only:

```bash
uv run vega-ui
```

or:

```bash
uv run python main.py
```

The backend runs on `127.0.0.1:8000`.

If the frontend has not been built, visiting `/` on the backend returns a small message explaining how to start the UI.

Frontend development server:

```bash
cd frontend
npm run dev
```

Vite runs on `127.0.0.1:5173` and proxies `/api` to the backend.

Built frontend served by FastAPI:

```bash
cd frontend
npm run build
```

After that, restart the backend and it will serve `frontend/dist` at `/`.

## Test

Backend:

```bash
uv run pytest
```

Frontend:

```bash
cd frontend
npm test
```

Optional frontend build verification:

```bash
cd frontend
npm run build
```

## Repository Hygiene

The repository is intentionally centered on a single implementation now:

- keep backend code in `vega_ui/`
- keep frontend code in `frontend/`
- keep Python tests in `tests/`
- do not reintroduce alternate app stacks in parallel directories
- keep `uv.lock` tracked
- keep `frontend/node_modules` and `frontend/dist` untracked

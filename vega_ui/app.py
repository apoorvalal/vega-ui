"""FastAPI application factory and entry point."""

from __future__ import annotations

from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from vega_ui.routes import charts, export, mutations
from vega_ui.store import SessionStore

FRONTEND_DIST = Path(__file__).parent.parent / "frontend" / "dist"


def create_app() -> FastAPI:
    """Create and configure the FastAPI application."""
    app = FastAPI(
        title="Vega-Altair WYSIWYG Editor",
        description="Stage A presentation editor for Vega-Lite / Altair charts",
        version="0.1.0",
    )

    # CORS for dev (Vite dev server on :5173)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Shared session store
    session_store = SessionStore()
    charts.store = session_store
    mutations.store = session_store
    export.store = session_store

    # API routes
    app.include_router(charts.router)
    app.include_router(mutations.router)
    app.include_router(export.router)

    @app.get("/health")
    def health() -> dict[str, str]:
        """Health endpoint for local verification."""
        return {"status": "ok"}

    if not FRONTEND_DIST.is_dir():
        @app.get("/")
        def root() -> dict[str, str]:
            """Explain how to run the frontend when no build is present."""
            return {
                "message": (
                    "Frontend build not found. Run `cd frontend && npm run dev` for local "
                    "development, or `cd frontend && npm run build` and restart the backend "
                    "to serve the built UI from FastAPI."
                )
            }

    # Serve frontend static files if built
    if FRONTEND_DIST.is_dir():
        app.mount("/", StaticFiles(directory=str(FRONTEND_DIST), html=True), name="frontend")

    return app


app = create_app()


def run() -> None:
    """CLI entry point: ``vega-ui``."""
    import uvicorn
    uvicorn.run("vega_ui.app:app", host="127.0.0.1", port=8000, reload=True)

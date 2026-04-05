"""FastAPI application entrypoint."""

from __future__ import annotations

from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates

from .editor import (
    EditorError,
    add_rule_annotation,
    add_text_annotation,
    apply_object_changes,
    build_document,
    build_document_from_text,
)
from .examples import stage_a_example_spec
from .models import (
    AddRuleAnnotationRequest,
    AddTextAnnotationRequest,
    LoadRequest,
    MutationRequest,
)

BASE_DIR = Path(__file__).resolve().parent
templates = Jinja2Templates(directory=str(BASE_DIR / "templates"))


def create_app() -> FastAPI:
    """Create the FastAPI application."""
    app = FastAPI(
        title="Vega UI",
        description="Stage A Vega-Lite presentation editor for Altair charts.",
        version="0.1.0",
    )
    app.mount("/static", StaticFiles(directory=str(BASE_DIR / "static")), name="static")

    @app.exception_handler(EditorError)
    async def editor_error_handler(_: Request, exc: EditorError) -> JSONResponse:
        payload = {"detail": exc.message}
        if exc.details:
            payload["context"] = exc.details
        return JSONResponse(status_code=400, content=payload)

    @app.get("/", response_class=HTMLResponse)
    async def index(request: Request) -> HTMLResponse:
        return templates.TemplateResponse(
            "index.html",
            {
                "request": request,
                "title": "Vega UI",
            },
        )

    @app.get("/health")
    async def health() -> dict[str, str]:
        return {"status": "ok"}

    @app.get("/api/example")
    async def example() -> dict[str, object]:
        return build_document(stage_a_example_spec())

    @app.post("/api/load")
    async def load_spec(payload: LoadRequest) -> dict[str, object]:
        return build_document_from_text(payload.spec_text)

    @app.post("/api/mutate")
    async def mutate_spec(payload: MutationRequest) -> dict[str, object]:
        return apply_object_changes(payload.spec, payload.object_id, payload.changes)

    @app.post("/api/annotations/text")
    async def create_text_annotation(
        payload: AddTextAnnotationRequest,
    ) -> dict[str, object]:
        return add_text_annotation(
            payload.spec,
            text=payload.text,
            x=payload.x,
            y=payload.y,
            color=payload.color,
            font_size=payload.font_size,
            align=payload.align,
        )

    @app.post("/api/annotations/rule")
    async def create_rule_annotation(
        payload: AddRuleAnnotationRequest,
    ) -> dict[str, object]:
        return add_rule_annotation(
            payload.spec,
            axis=payload.axis,
            value=payload.value,
            label=payload.label,
            color=payload.color,
            stroke_width=payload.stroke_width,
            label_color=payload.label_color,
            label_font_size=payload.label_font_size,
        )

    return app


app = create_app()

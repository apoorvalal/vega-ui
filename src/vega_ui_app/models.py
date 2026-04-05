"""Request and response models for the editor API."""

from __future__ import annotations

from enum import Enum
from typing import Any, Literal

from pydantic import BaseModel, Field


class SupportMode(str, Enum):
    editable = "editable"
    read_only = "read_only"


class SelectOption(BaseModel):
    label: str
    value: str


class FieldDescriptor(BaseModel):
    name: str
    label: str
    control: Literal["checkbox", "number", "select", "text", "textarea"]
    value: Any = None
    options: list[SelectOption] = Field(default_factory=list)
    disabled: bool = False
    help_text: str | None = None
    min: float | None = None
    max: float | None = None
    step: float | None = None
    placeholder: str | None = None


class ObjectDescriptor(BaseModel):
    id: str
    kind: str
    label: str
    description: str
    fields: list[FieldDescriptor] = Field(default_factory=list)


class SupportStatus(BaseModel):
    mode: SupportMode
    warnings: list[str] = Field(default_factory=list)


class DocumentResponse(BaseModel):
    spec: dict[str, Any]
    spec_json: str
    python_code: str
    preview_data_url: str
    support: SupportStatus
    objects: list[ObjectDescriptor] = Field(default_factory=list)


class LoadRequest(BaseModel):
    spec_text: str = Field(min_length=2, max_length=500_000)


class MutationRequest(BaseModel):
    spec: dict[str, Any]
    object_id: str = Field(min_length=1)
    changes: dict[str, Any] = Field(default_factory=dict)


class AddTextAnnotationRequest(BaseModel):
    spec: dict[str, Any]
    text: str = Field(min_length=1, max_length=200)
    x: Any
    y: Any
    color: str = Field(default="#d94841", max_length=50)
    font_size: int = Field(default=14, ge=8, le=72)
    align: Literal["left", "center", "right"] = "left"


class AddRuleAnnotationRequest(BaseModel):
    spec: dict[str, Any]
    axis: Literal["x", "y"]
    value: Any
    label: str = Field(default="", max_length=120)
    color: str = Field(default="#d94841", max_length=50)
    stroke_width: float = Field(default=2.0, ge=0.5, le=12.0)
    label_color: str = Field(default="#d94841", max_length=50)
    label_font_size: int = Field(default=12, ge=8, le=72)

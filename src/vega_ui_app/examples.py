"""Example Vega-Lite specifications used by the UI."""

from __future__ import annotations

from typing import Any

from .constants import SCHEMA_URL


def stage_a_example_spec() -> dict[str, Any]:
    """Return a supported example chart that exercises Stage A controls."""
    return {
        "$schema": SCHEMA_URL,
        "description": "Quarterly revenue by region for Stage A editor testing.",
        "title": {
            "text": "Quarterly Revenue",
            "subtitle": "Structure-first Stage A editor example",
        },
        "width": 560,
        "height": 320,
        "background": "#f7f4ee",
        "padding": 12,
        "data": {
            "values": [
                {"quarter": "Q1", "region": "North", "revenue": 148},
                {"quarter": "Q2", "region": "North", "revenue": 173},
                {"quarter": "Q3", "region": "North", "revenue": 189},
                {"quarter": "Q4", "region": "North", "revenue": 214},
                {"quarter": "Q1", "region": "South", "revenue": 122},
                {"quarter": "Q2", "region": "South", "revenue": 136},
                {"quarter": "Q3", "region": "South", "revenue": 168},
                {"quarter": "Q4", "region": "South", "revenue": 181},
            ]
        },
        "mark": {
            "type": "point",
            "filled": True,
            "size": 130,
            "opacity": 0.85,
            "stroke": "#1f2933",
            "strokeWidth": 1.5,
        },
        "encoding": {
            "x": {
                "field": "quarter",
                "type": "ordinal",
                "axis": {"title": "Quarter", "labelAngle": 0},
            },
            "y": {
                "field": "revenue",
                "type": "quantitative",
                "axis": {"title": "Revenue ($k)", "format": "~s"},
            },
            "color": {
                "field": "region",
                "type": "nominal",
                "legend": {"title": "Region", "orient": "right"},
            },
        },
    }

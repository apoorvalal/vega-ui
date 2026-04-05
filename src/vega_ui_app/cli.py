"""Command-line entrypoint for running the web application."""

from __future__ import annotations

import argparse

import uvicorn


def main() -> int:
    """Run the development server."""
    parser = argparse.ArgumentParser(description="Run the Vega UI development server.")
    parser.add_argument("--host", default="127.0.0.1", help="Bind host for Uvicorn.")
    parser.add_argument("--port", type=int, default=8000, help="Bind port for Uvicorn.")
    parser.add_argument(
        "--reload",
        action="store_true",
        help="Enable auto-reload for local development.",
    )
    args = parser.parse_args()

    uvicorn.run(
        "vega_ui.app:create_app",
        factory=True,
        host=args.host,
        port=args.port,
        reload=args.reload,
    )
    return 0

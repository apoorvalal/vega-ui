"""Module entrypoint for `python -m vega_ui`."""

from .cli import main

if __name__ == "__main__":
    raise SystemExit(main())

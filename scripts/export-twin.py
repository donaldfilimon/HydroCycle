"""Run from services/model with uv run --frozen python ../../scripts/export-twin.py."""

from __future__ import annotations

import argparse
from pathlib import Path

from hydrocycle.twin import render_twin_manifest


def main() -> None:
    parser = argparse.ArgumentParser(description="Export deterministic reference twin geometry")
    parser.add_argument(
        "output",
        type=Path,
        nargs="?",
        default=Path(__file__).resolve().parents[1]
        / "packages/contracts/fixtures/twin-reference.json",
    )
    args = parser.parse_args()
    args.output.write_text(render_twin_manifest(), encoding="utf-8")


if __name__ == "__main__":
    main()

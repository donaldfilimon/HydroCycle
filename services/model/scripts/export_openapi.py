"""Write the canonical, deterministically formatted OpenAPI document."""

from __future__ import annotations

import argparse
import json
from pathlib import Path

from hydrocycle.api import app


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("output", type=Path)
    args = parser.parse_args()
    rendered = json.dumps(app.openapi(), indent=2, sort_keys=True, ensure_ascii=False) + "\n"
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(rendered, encoding="utf-8")


if __name__ == "__main__":
    main()

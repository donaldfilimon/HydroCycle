"""Export deterministic contract examples from the Pydantic source models."""

from __future__ import annotations

import argparse
import json
from pathlib import Path

from hydrocycle.schemas import EvidenceBasis, Scenario, SimulationInput


def _write(path: Path, payload: object) -> None:
    rendered = json.dumps(payload, indent=2, sort_keys=True, ensure_ascii=False) + "\n"
    path.write_text(rendered, encoding="utf-8")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("output", type=Path)
    args = parser.parse_args()
    args.output.mkdir(parents=True, exist_ok=True)

    default_input = SimulationInput()
    _write(
        args.output / "simulation-input.default.json",
        default_input.model_dump(mode="json", exclude_none=False),
    )

    measured_payload = default_input.model_dump(mode="json", exclude_none=False)
    measured_payload["sample"]["measured_total_h2_mg_l"] = {
        "value": 2.0,
        "unit": "mg/L",
        "standard_uncertainty": 0.1,
        "distribution": "normal",
        "source_id": "example-headspace-gc-total-h2",
        "basis": EvidenceBasis.MEASURED.value,
    }
    measured_payload["bubble_population"] = None
    _write(args.output / "simulation-input.measured-total.json", measured_payload)

    water_injection_payload = default_input.model_dump(mode="json", exclude_none=False)
    water_injection_payload["scenario"] = Scenario.HYDROGEN_WITH_WATER_INJECTION.value
    water_injection_payload["sample"]["measured_total_h2_mg_l"] = {
        "value": None,
        "unit": "mg/L",
        "standard_uncertainty": 0.0,
        "distribution": "fixed",
        "source_id": None,
        "basis": "derived",
    }
    _write(args.output / "simulation-input.water-injection.json", water_injection_payload)


if __name__ == "__main__":
    main()

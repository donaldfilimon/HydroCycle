"""Bake public reference results from the local solver, without runtime data."""

from __future__ import annotations

import json
import subprocess
from pathlib import Path

from hydrocycle.physics import default_simulation_input, run_simulation
from hydrocycle.schemas import SimulationInput

ROOT = Path(__file__).resolve().parents[1]


def main() -> None:
    solver_changed = subprocess.run(
        ["git", "diff", "--quiet", "HEAD", "--", "services/model/src/hydrocycle"],
        cwd=ROOT,
        check=False,
    ).returncode
    if solver_changed not in (0, 1):
        raise RuntimeError("Cannot establish solver source provenance")
    payload = {
        "status": "CONCEPT, UNVALIDATED",
        "recorded_date": "2026-09-29",
        "source_commit": subprocess.check_output(
            ["git", "rev-parse", "HEAD"], cwd=ROOT, text=True
        ).strip(),
        "source_state": (
            "Local working tree; solver files changed from source commit"
            if solver_changed
            else "Local working tree; solver files unchanged from source commit"
        ),
        "cases": [
            {
                "name": name,
                "basis": basis,
                "result": run_simulation(request).model_dump(mode="json"),
            }
            for name, basis, request in [
                (
                    "Ambient dissolved-plus-bubble estimate",
                    "Derived loading with assumed bubble gas content; no measured total",
                    SimulationInput(),
                ),
                (
                    "Ambient literature comparison",
                    "Literature total 1.9 mg/L replaces derived loading; not a hardware measurement",
                    default_simulation_input("literature"),
                ),
            ]
        ],
    }
    target = ROOT / "apps/web/public/local-model-results.json"
    target.write_text(json.dumps(payload, indent=2, sort_keys=True) + "\n")
    print(f"Exported {len(payload['cases'])} public reference cases to {target}")


if __name__ == "__main__":
    main()

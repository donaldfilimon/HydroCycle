"""Deterministic test-run and neutral 0D boundary-condition exports."""

from __future__ import annotations

import csv
import hashlib
import io
import json
from datetime import UTC, datetime
from typing import Any
from zipfile import ZIP_DEFLATED, ZipFile, ZipInfo

from sqlalchemy import select
from sqlalchemy.orm import Session

from .imports import CSV_HEADERS
from .orm import (
    AttachmentRecord,
    EvidenceRecord,
    SimulationRecord,
    TestRunRecord,
    test_run_simulations,
)
from .test_run_contracts import (
    CalibrationReference,
    ComparisonCollection,
    EvidenceDocument,
    TestRunMeasurements,
    TestRunProvenance,
    TestRunStatus,
    validate_review_state,
)


class ExportError(ValueError):
    """An export request that is valid HTTP but unavailable for this run."""


def _iso8601(value: datetime) -> str:
    if value.tzinfo is None:
        value = value.replace(tzinfo=UTC)
    return value.astimezone(UTC).isoformat().replace("+00:00", "Z")


def _canonical_json_bytes(payload: dict[str, Any]) -> bytes:
    return json.dumps(
        payload,
        ensure_ascii=False,
        allow_nan=False,
        sort_keys=True,
        separators=(",", ":"),
    ).encode("utf-8")


def attachment_metadata(record: AttachmentRecord) -> dict[str, Any]:
    """Return provenance metadata without exposing an owned filesystem name."""

    return {
        "id": record.id,
        "canonical_name": record.canonical_name,
        "mime_type": record.mime_type,
        "size_bytes": record.size_bytes,
        "sha256": record.sha256,
        "locally_owned": record.locally_owned,
        "metadata": record.metadata_json,
        "import_warnings": record.import_warnings_json,
        "created_at": _iso8601(record.created_at),
    }


def evidence_payload(record: EvidenceRecord) -> dict[str, Any]:
    payload = {
        "id": record.id,
        "kind": record.kind,
        **record.payload_json,
        "created_at": _iso8601(record.created_at),
    }
    return EvidenceDocument.model_validate(payload).model_dump(mode="json", exclude_none=False)


def test_run_payload(record: TestRunRecord) -> dict[str, Any]:
    provenance = TestRunProvenance.model_validate(record.provenance_json)
    measurements = TestRunMeasurements.model_validate(record.measurements_json)
    calibrations = [CalibrationReference.model_validate(item) for item in record.calibrations_json]
    comparisons = ComparisonCollection.model_validate(record.comparisons_json)
    return {
        "id": record.id,
        "name": record.name,
        "status": record.status,
        "operator": record.operator,
        "sample_id": record.sample_id,
        "provenance": provenance.model_dump(mode="json", exclude_none=False),
        "measurements": measurements.model_dump(mode="json", by_alias=True, exclude_none=False),
        "calibration_references": [
            item.model_dump(mode="json", exclude_none=False) for item in calibrations
        ],
        "comparisons": comparisons.model_dump(mode="json", exclude_none=False),
        "notes": record.review_notes,
        "is_demo_synthetic": bool(record.provenance_json.get("is_demo_synthetic", False)),
        "attachments": [
            attachment_metadata(item)
            for item in sorted(record.attachments, key=lambda item: _iso8601(item.created_at))
        ],
        "simulation_ids": [
            item.id
            for item in sorted(record.simulations, key=lambda item: _iso8601(item.created_at))
        ],
        "evidence": [
            evidence_payload(item)
            for item in sorted(
                record.evidence_records,
                key=lambda item: _iso8601(item.created_at),
            )
        ],
        "created_at": _iso8601(record.created_at),
        "updated_at": _iso8601(record.updated_at),
    }


def canonical_test_run_export(session: Session, record: TestRunRecord) -> tuple[bytes, str, str]:
    simulations = session.scalars(
        select(SimulationRecord)
        .join(
            test_run_simulations,
            SimulationRecord.id == test_run_simulations.c.simulation_id,
        )
        .where(test_run_simulations.c.test_run_id == record.id)
        .order_by(SimulationRecord.created_at)
    ).all()
    payload: dict[str, Any] = {
        "schema_version": "1.0.0",
        "test_run": test_run_payload(record),
        "simulations": [
            {
                "id": simulation.id,
                "input": simulation.input_json,
                "result": simulation.result_json,
                "diagnostics": simulation.diagnostics_json,
                "reproducibility": simulation.reproducibility_json,
                "created_at": _iso8601(simulation.created_at),
            }
            for simulation in simulations
        ],
    }
    content = _canonical_json_bytes(payload)
    payload["content_sha256"] = hashlib.sha256(content).hexdigest()
    return _canonical_json_bytes(payload), "application/json", "test_run.json"


def _format_number(value: Any) -> str:
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        raise ExportError("Reviewed measurement rows must contain only numeric data")
    return format(value, ".15g")


def reviewed_csv_export(record: TestRunRecord) -> tuple[bytes, str, str]:
    if record.status != TestRunStatus.VALID:
        raise ExportError("Reviewed CSV export requires a test run with valid status")

    try:
        measurements = TestRunMeasurements.model_validate(record.measurements_json)
        calibrations = [
            CalibrationReference.model_validate(item) for item in record.calibrations_json
        ]
        validate_review_state(
            TestRunStatus.VALID,
            measurements,
            calibrations,
            require_series=True,
        )
    except ValueError as error:
        raise ExportError(f"Reviewed CSV validation failed: {error}") from error

    measurement_payload = measurements.model_dump(mode="json", by_alias=True, exclude_none=False)

    rendered: list[tuple[str, bytes]] = []
    for filename, headers in CSV_HEADERS.items():
        rows = measurement_payload.get(filename)
        if rows is None:
            continue
        if not isinstance(rows, list):
            raise ExportError(f"{filename} measurements are not a row array")
        stream = io.StringIO(newline="")
        writer = csv.DictWriter(stream, fieldnames=list(headers), lineterminator="\n")
        writer.writeheader()
        for row in rows:
            if not isinstance(row, dict) or set(row) != set(headers):
                raise ExportError(f"{filename} contains an invalid row shape")
            writer.writerow({header: _format_number(row[header]) for header in headers})
        rendered.append((filename, stream.getvalue().encode("utf-8")))

    if not rendered:
        raise ExportError("This test run has no canonical measurement series to export")

    output = io.BytesIO()
    with ZipFile(output, "w", compression=ZIP_DEFLATED, compresslevel=9) as archive:
        for filename, content in sorted(rendered):
            info = ZipInfo(filename=filename, date_time=(1980, 1, 1, 0, 0, 0))
            info.compress_type = ZIP_DEFLATED
            info.external_attr = 0o600 << 16
            archive.writestr(info, content)
    return output.getvalue(), "application/zip", "reviewed_measurements.zip"


def _extract_trace(result: dict[str, Any]) -> tuple[str, dict[str, Any]]:
    proposed = result.get("proposed_cycle")
    if isinstance(proposed, dict):
        return "proposed_cycle", proposed
    motored = result.get("motored_baseline")
    if isinstance(motored, dict):
        return "motored_baseline", motored
    raise ExportError("The saved simulation has no 0D cycle trace")


def _value(quantity: Any) -> float | None:
    if isinstance(quantity, dict):
        quantity = quantity.get("value")
    if isinstance(quantity, bool) or not isinstance(quantity, (int, float)):
        return None
    return float(quantity)


def _engine_geometry_si(request: dict[str, Any]) -> dict[str, float]:
    engine = request.get("engine", {})
    if not isinstance(engine, dict):
        return {}
    output: dict[str, float] = {}
    conversions = {
        "displacement_l": ("displacement_m3", 1e-3),
        "bore_mm": ("bore_m", 1e-3),
        "stroke_mm": ("stroke_m", 1e-3),
        "connecting_rod_mm": ("connecting_rod_m", 1e-3),
        "compression_ratio": ("compression_ratio", 1.0),
    }
    for source, (target, scale) in conversions.items():
        value = _value(engine.get(source))
        if value is not None:
            output[target] = value * scale
    return output


def _homogeneous_states(trace: dict[str, Any]) -> list[dict[str, Any]]:
    required = (
        "crank_angle_deg",
        "volume_m3",
        "pressure_pa",
        "temperature_k",
        "h2_mg",
        "o2_mg",
        "n2_mg",
        "h2o_vapor_mg",
    )
    arrays: dict[str, list[Any]] = {}
    for key in required:
        value = trace.get(key)
        if not isinstance(value, list):
            raise ExportError("The saved cycle trace is missing required homogeneous arrays")
        arrays[key] = value
    lengths = {len(value) for value in arrays.values()}
    if len(lengths) != 1 or not lengths or next(iter(lengths)) < 2:
        raise ExportError("The saved cycle arrays do not share a valid length")

    molar_mass_mg_per_mol = {
        "H2": 2_015.88,
        "O2": 31_998.8,
        "N2": 28_013.4,
        "H2O": 18_015.28,
    }
    states: list[dict[str, Any]] = []
    count = next(iter(lengths))
    for index in range(count):
        moles = {
            "H2": max(float(arrays["h2_mg"][index]), 0.0) / molar_mass_mg_per_mol["H2"],
            "O2": max(float(arrays["o2_mg"][index]), 0.0) / molar_mass_mg_per_mol["O2"],
            "N2": max(float(arrays["n2_mg"][index]), 0.0) / molar_mass_mg_per_mol["N2"],
            "H2O": max(float(arrays["h2o_vapor_mg"][index]), 0.0) / molar_mass_mg_per_mol["H2O"],
        }
        total_moles = sum(moles.values())
        mole_fractions = (
            {species: amount / total_moles for species, amount in moles.items()}
            if total_moles > 0.0
            else dict.fromkeys(moles, 0.0)
        )
        states.append(
            {
                "crank_angle_deg": float(arrays["crank_angle_deg"][index]),
                "volume_m3": float(arrays["volume_m3"][index]),
                "pressure_pa": float(arrays["pressure_pa"][index]),
                "temperature_k": float(arrays["temperature_k"][index]),
                "mole_fractions": mole_fractions,
            }
        )
    return states


def cfd_boundary_export(
    session: Session,
    record: TestRunRecord,
    *,
    model_metadata: dict[str, Any],
    simulation_id: str | None = None,
) -> tuple[bytes, str, str]:
    statement = (
        select(SimulationRecord)
        .join(
            test_run_simulations,
            SimulationRecord.id == test_run_simulations.c.simulation_id,
        )
        .where(test_run_simulations.c.test_run_id == record.id)
    )
    if simulation_id is not None:
        statement = statement.where(SimulationRecord.id == simulation_id)
    statement = statement.order_by(SimulationRecord.created_at.desc())
    simulation = session.scalars(statement).first()
    if simulation is None:
        raise ExportError("No matching persisted simulation is linked to this test run")

    _trace_kind, trace = _extract_trace(simulation.result_json)
    request = simulation.input_json
    reproducibility = simulation.reproducibility_json
    states = _homogeneous_states(trace)
    liquid = trace.get("water_liquid_mg", [])
    vapor = trace.get("water_vapor_mg", [])
    water_loading = 0.0
    if isinstance(liquid, list) and liquid:
        water_loading += max(float(liquid[0]), 0.0)
    if isinstance(vapor, list) and vapor:
        water_loading += max(float(vapor[0]), 0.0)
    payload: dict[str, Any] = {
        "schema_version": "1.0.0",
        "export_kind": "homogeneous_0d_boundary_only",
        "engine_geometry": _engine_geometry_si(request),
        "states": states,
        "water_loading_mg_per_cycle": water_loading,
        "mechanism": reproducibility.get(
            "mechanism", model_metadata.get("mechanism", "gri30.yaml")
        ),
        "mechanism_sha256": reproducibility.get(
            "mechanism_sha256", model_metadata.get("mechanism_sha256")
        ),
        "missing_fields": [
            "spatial_mesh",
            "velocity_field",
            "turbulence_field",
            "spray_droplet_field",
            "flame_front",
        ],
    }
    content = _canonical_json_bytes(payload)
    return content, "application/json", "homogeneous_0d_boundary.json"


__all__ = [
    "ExportError",
    "attachment_metadata",
    "canonical_test_run_export",
    "cfd_boundary_export",
    "evidence_payload",
    "reviewed_csv_export",
    "test_run_payload",
]

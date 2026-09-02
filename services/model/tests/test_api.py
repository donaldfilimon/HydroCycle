from __future__ import annotations

import hashlib
import io
import json
from pathlib import Path
from typing import Any
from uuid import uuid4
from zipfile import ZipFile

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import select

from hydrocycle.api import PROJECT_ROOT, create_app
from hydrocycle.database import Database
from hydrocycle.orm import AttachmentRecord
from hydrocycle.orm import EvidenceRecord as OrmEvidenceRecord
from hydrocycle.orm import TestRunRecord as OrmTestRunRecord
from hydrocycle.physics import default_simulation_input
from hydrocycle.schemas import CfdBoundaryExport


@pytest.fixture
def api_client(tmp_path: Path) -> tuple[TestClient, FastAPI, Path]:
    attachments = tmp_path / "attachments"
    application = create_app(
        database_url=f"sqlite+pysqlite:///{tmp_path / 'api.db'}",
        attachments_dir=attachments,
    )
    with TestClient(application) as client:
        yield client, application, attachments


def create_run(client: TestClient, **overrides: Any) -> dict[str, Any]:
    payload: dict[str, Any] = {
        "name": "Bench A",
        "status": "draft",
        "operator": None,
        "sample_id": "S-001",
        "measurements": {"headspace_gc_mg_l": None},
        "calibration_references": [],
        "provenance": {"source": "test fixture"},
    }
    payload.update(overrides)
    response = client.post("/api/v1/test-runs", json=payload)
    assert response.status_code == 201, response.text
    return response.json()


def calibration(
    calibration_id: str,
    *series: str,
    method: str = "calibrated test method",
) -> dict[str, Any]:
    return {
        "id": calibration_id,
        "instrument": "test instrument",
        "method": method,
        "applies_to": list(series),
    }


def measured(
    value: float,
    unit: str,
    source_id: str,
    *,
    standard_uncertainty: float = 0.1,
) -> dict[str, Any]:
    return {
        "value": value,
        "unit": unit,
        "standard_uncertainty": standard_uncertainty,
        "distribution": "normal",
        "source_id": source_id,
        "basis": "measured",
    }


def canonical_json_bytes(payload: dict[str, Any]) -> bytes:
    unhashed = dict(payload)
    unhashed.pop("content_sha256", None)
    canonical = json.dumps(
        unhashed,
        ensure_ascii=False,
        allow_nan=False,
        sort_keys=True,
        separators=(",", ":"),
    ).encode()
    unhashed["content_sha256"] = hashlib.sha256(canonical).hexdigest()
    return json.dumps(
        unhashed,
        ensure_ascii=False,
        allow_nan=False,
        sort_keys=True,
        separators=(",", ":"),
    ).encode()


def evidence_payload(**overrides: Any) -> dict[str, Any]:
    payload: dict[str, Any] = {
        "kind": "measured",
        "title": "Calibrated local evidence",
        "author_or_publisher": "HydroCycle test fixture",
        "publication_date": "2026-08-24",
        "url": "https://example.com/method",
        "method": "calibrated analytical method",
        "value_or_range": "2.0 to 2.2",
        "unit": "mg/L",
        "uncertainty": "0.1 mg/L standard uncertainty",
        "applicability_note": "Test-only API contract evidence.",
    }
    payload.update(overrides)
    return payload


def test_relative_attachment_configuration_stays_under_project_root(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("HYDROCYCLE_ATTACHMENTS_DIR", "data/configured-attachments")
    application = create_app(database_url="sqlite+pysqlite:///:memory:")
    assert application.state.attachments_dir == PROJECT_ROOT / "data/configured-attachments"


def test_memory_schema_is_explicitly_unversioned() -> None:
    database = Database("sqlite+pysqlite:///:memory:")
    try:
        database.initialize()
        schema = database.schema_status()
        assert schema["status"] == "unversioned"
        assert schema["alembic_revision"] is None
        assert schema["missing_tables"] == []
    finally:
        database.dispose()


def test_health_metadata_and_local_only_cors(api_client: tuple[TestClient, FastAPI, Path]) -> None:
    client, _application, _attachments = api_client
    health = client.get("/api/v1/health")
    assert health.status_code == 200
    document = health.json()
    assert document["service"] == "hydrocycle-model"
    assert document["database"] == "ok"
    assert document["schema"]["status"] == "current"
    assert document["schema"]["alembic_revision"] == "0002_test_run_status_index"
    assert document["mechanism"] == "gri30.yaml"

    metadata = client.get("/api/v1/model-metadata")
    assert metadata.status_code == 200
    assert metadata.json()["schema_version"] == "1.0.0"
    assert "first_law" in metadata.json()["equations"]

    local = client.options(
        "/api/v1/health",
        headers={
            "Origin": "http://127.0.0.1:5173",
            "Access-Control-Request-Method": "GET",
        },
    )
    assert local.headers["access-control-allow-origin"] == "http://127.0.0.1:5173"
    assert "access-control-allow-credentials" not in local.headers

    external = client.options(
        "/api/v1/health",
        headers={
            "Origin": "https://example.com",
            "Access-Control-Request-Method": "GET",
        },
    )
    assert "access-control-allow-origin" not in external.headers


def test_test_run_crud_preserves_null_and_requires_delete_confirmation(
    api_client: tuple[TestClient, FastAPI, Path],
) -> None:
    client, _application, _attachments = api_client
    created = create_run(client)
    assert created["measurements"]["headspace_gc_mg_l"] is None
    assert created["operator"] is None

    patched = client.patch(
        f"/api/v1/test-runs/{created['id']}",
        json={
            "expected_updated_at": created["updated_at"],
            "status": "needs_review",
            "notes": "Awaiting calibration review",
        },
    )
    assert patched.status_code == 200
    assert patched.json()["status"] == "needs_review"
    assert patched.json()["notes"] == "Awaiting calibration review"

    listing = client.get("/api/v1/test-runs")
    assert [item["id"] for item in listing.json()] == [created["id"]]

    refused = client.delete(
        f"/api/v1/test-runs/{created['id']}",
        params={"expected_updated_at": patched.json()["updated_at"]},
    )
    assert refused.status_code == 409
    deleted = client.delete(
        f"/api/v1/test-runs/{created['id']}",
        params={"confirm": True, "expected_updated_at": patched.json()["updated_at"]},
    )
    assert deleted.status_code == 200
    assert deleted.json()["deleted"] is True
    assert client.get(f"/api/v1/test-runs/{created['id']}").status_code == 404


def test_partial_edit_and_export_preserve_unedited_provenance(
    api_client: tuple[TestClient, FastAPI, Path],
) -> None:
    client, _application, _attachments = api_client
    import_hash = "c" * 64
    created = create_run(
        client,
        name="Provenance source",
        sample_id="SAMPLE-PRESERVE-1",
        provenance={
            "source": "canonical JSON import",
            "method": "headspace GC",
            "ui_origin": "import endpoint",
            "import_sha256": import_hash,
            "source_test_run_id": "upstream-run-1",
            "is_demo_synthetic": False,
        },
        comparisons={
            "items": [
                {
                    "id": "comparison-preserve-1",
                    "kind": "retention",
                    "label": "Imported comparison",
                    "measured_value": 0.71,
                    "modeled_value": 0.68,
                    "unit": "fraction",
                }
            ]
        },
        evidence=[evidence_payload(title="Imported evidence sentinel")],
    )

    edited = client.patch(
        f"/api/v1/test-runs/{created['id']}",
        json={
            "expected_updated_at": created["updated_at"],
            "name": "Edited provenance source",
            "notes": "metadata-only edit",
        },
    )
    assert edited.status_code == 200, edited.text

    exported = client.get(
        f"/api/v1/test-runs/{created['id']}/export",
        params={"format": "json", "expected_updated_at": edited.json()["updated_at"]},
    )
    assert exported.status_code == 200, exported.text
    document = exported.json()["test_run"]
    assert document["sample_id"] == "SAMPLE-PRESERVE-1"
    assert document["provenance"] == {
        "source": "canonical JSON import",
        "method": "headspace GC",
        "ui_origin": "import endpoint",
        "import_sha256": import_hash,
        "source_test_run_id": "upstream-run-1",
        "is_demo_synthetic": False,
    }
    assert document["comparisons"]["items"][0]["id"] == "comparison-preserve-1"
    assert [item["title"] for item in document["evidence"]] == ["Imported evidence sentinel"]


def test_patch_rejects_a_stale_expected_update_timestamp(
    api_client: tuple[TestClient, FastAPI, Path],
) -> None:
    client, _application, _attachments = api_client
    created = create_run(client)
    first = client.patch(
        f"/api/v1/test-runs/{created['id']}",
        json={"expected_updated_at": created["updated_at"], "notes": "first edit"},
    )
    assert first.status_code == 200, first.text

    stale = client.patch(
        f"/api/v1/test-runs/{created['id']}",
        json={"expected_updated_at": created["updated_at"], "notes": "stale edit"},
    )
    assert stale.status_code == 409
    assert "changed since it was loaded" in stale.json()["detail"]

    stale_export = client.get(
        f"/api/v1/test-runs/{created['id']}/export",
        params={"expected_updated_at": created["updated_at"]},
    )
    assert stale_export.status_code == 409
    assert "refresh before exporting" in stale_export.json()["detail"]

    stale_import = client.post(
        "/api/v1/test-runs/import",
        params={
            "test_run_id": created["id"],
            "expected_updated_at": created["updated_at"],
            "calibration_reference": "STALE-CAL",
        },
        headers={"X-Filename": "hydrogen_decay.csv", "Content-Type": "text/csv"},
        content="time_s,total_h2_mg_L,uncertainty_mg_L\n0,2.2,0.1\n",
    )
    assert stale_import.status_code == 409
    assert "refresh before importing" in stale_import.json()["detail"]

    stale_delete = client.delete(
        f"/api/v1/test-runs/{created['id']}",
        params={"confirm": True, "expected_updated_at": created["updated_at"]},
    )
    assert stale_delete.status_code == 409
    assert "refresh before deleting" in stale_delete.json()["detail"]
    assert client.get(f"/api/v1/test-runs/{created['id']}").status_code == 200

    missing_precondition = client.patch(
        f"/api/v1/test-runs/{created['id']}",
        json={"measurements": created["measurements"]},
    )
    assert missing_precondition.status_code == 422
    assert missing_precondition.json()["detail"][0]["loc"] == [
        "body",
        "expected_updated_at",
    ]


def test_typed_scalar_measurement_round_trip_preserves_full_uncertainty(
    api_client: tuple[TestClient, FastAPI, Path],
) -> None:
    client, _application, _attachments = api_client
    quantity = measured(2.17, "mg/L", "GC-CAL-1", standard_uncertainty=0.08)
    created = create_run(
        client,
        measurements={"total_h2_mg_l": quantity},
        calibration_references=[calibration("GC-CAL-1")],
    )
    assert created["measurements"]["total_h2_mg_l"] == quantity

    retrieved = client.get(f"/api/v1/test-runs/{created['id']}")
    assert retrieved.status_code == 200
    assert retrieved.json()["measurements"]["total_h2_mg_l"] == quantity


def test_simulation_rejects_uncertain_quantity_without_source_basis(
    api_client: tuple[TestClient, FastAPI, Path],
) -> None:
    client, _application, _attachments = api_client
    request = default_simulation_input().model_dump(mode="json")
    request["sample"]["carrier_volume_ml_per_cycle"]["source_id"] = None

    response = client.post("/api/v1/simulations", json=request)
    assert response.status_code == 422
    assert "source basis" in response.text


@pytest.mark.parametrize(
    "measurements",
    [
        {"invented_measurement": 1.0},
        {"total_h2_mg_l": measured(-1.0, "mg/L", "GC-CAL-1")},
        {
            "total_h2_mg_l": {
                "value": 2.0,
                "unit": "mg/L",
                "standard_uncertainty": 0.0,
                "distribution": "fixed",
                "source_id": "GC-CAL-1",
                "basis": "measured",
            }
        },
        {
            "pressure_trace.csv": [
                {
                    "crank_angle_deg": 0.0,
                    "pressure_bar": 2.0,
                    "uncertainty_bar": 0.1,
                },
                {
                    "crank_angle_deg": 0.0,
                    "pressure_bar": 3.0,
                    "uncertainty_bar": 0.1,
                },
            ]
        },
        {
            "hydrogen_decay.csv": [
                {"time_s": 60.0, "total_h2_mg_L": 1.9, "uncertainty_mg_L": 0.1},
                {"time_s": 0.0, "total_h2_mg_L": 2.0, "uncertainty_mg_L": 0.1},
            ]
        },
    ],
)
def test_direct_crud_rejects_arbitrary_or_invalid_measurements(
    api_client: tuple[TestClient, FastAPI, Path],
    measurements: dict[str, Any],
) -> None:
    client, _application, _attachments = api_client
    response = client.post(
        "/api/v1/test-runs",
        json={"name": "Invalid direct record", "measurements": measurements},
    )
    assert response.status_code == 422


def test_direct_crud_rejects_nonfinite_measurement_json(
    api_client: tuple[TestClient, FastAPI, Path],
) -> None:
    client, _application, _attachments = api_client
    raw = (
        '{"name":"Nonfinite","measurements":{"total_h2_mg_l":'
        '{"value":NaN,"unit":"mg/L","standard_uncertainty":0.1,'
        '"distribution":"normal","source_id":"GC-CAL-1","basis":"measured"}}}'
    )
    response = client.post(
        "/api/v1/test-runs",
        headers={"Content-Type": "application/json"},
        content=raw,
    )
    assert response.status_code == 422


def test_review_status_cannot_bypass_measurement_and_calibration_validation(
    api_client: tuple[TestClient, FastAPI, Path],
) -> None:
    client, application, _attachments = api_client
    no_measurements = client.post(
        "/api/v1/test-runs",
        json={"name": "Forged valid run", "status": "valid"},
    )
    assert no_measurements.status_code == 422

    scalar_only = client.post(
        "/api/v1/test-runs",
        json={
            "name": "Scalar-only reviewed run",
            "status": "valid",
            "measurements": {"total_h2_mg_l": measured(2.0, "mg/L", "GC-CAL-SCALAR")},
            "calibration_references": [calibration("GC-CAL-SCALAR")],
        },
    )
    assert scalar_only.status_code == 201, scalar_only.text
    reviewed_scalar = client.get(
        f"/api/v1/test-runs/{scalar_only.json()['id']}/export",
        params={
            "format": "reviewed_csv",
            "expected_updated_at": scalar_only.json()["updated_at"],
        },
    )
    assert reviewed_scalar.status_code == 409
    assert "canonical measurement series" in reviewed_scalar.text

    no_calibration = client.post(
        "/api/v1/test-runs",
        json={
            "name": "Uncalibrated series",
            "status": "valid",
            "measurements": {
                "pressure_trace.csv": [
                    {
                        "crank_angle_deg": 0.0,
                        "pressure_bar": 1.0,
                        "uncertainty_bar": 0.1,
                    }
                ]
            },
        },
    )
    assert no_calibration.status_code == 422

    zero_uncertainty = client.post(
        "/api/v1/test-runs",
        json={
            "name": "Zero-uncertainty reviewed series",
            "status": "valid",
            "measurements": {
                "pressure_trace.csv": [
                    {
                        "crank_angle_deg": 0.0,
                        "pressure_bar": 1.0,
                        "uncertainty_bar": 0.0,
                    }
                ]
            },
            "calibration_references": [calibration("PRESSURE-CAL", "pressure_trace.csv")],
        },
    )
    assert zero_uncertainty.status_code == 422

    draft = create_run(
        client,
        measurements={
            "pressure_trace.csv": [
                {
                    "crank_angle_deg": 0.0,
                    "pressure_bar": 1.0,
                    "uncertainty_bar": 0.1,
                }
            ]
        },
    )
    patch = client.patch(
        f"/api/v1/test-runs/{draft['id']}",
        json={"expected_updated_at": draft["updated_at"], "status": "valid"},
    )
    assert patch.status_code == 422

    residual_draft = create_run(
        client,
        measurements={
            "total_h2_mg_l": measured(2.0, "mg/L", "GC-CAL-RESIDUAL"),
            "retained_h2_mg_l": measured(1.0, "mg/L", "GC-CAL-RESIDUAL"),
            "released_h2_mg_l": measured(0.2, "mg/L", "GC-CAL-RESIDUAL"),
            "unaccounted_h2_mg_l": measured(0.2, "mg/L", "GC-CAL-RESIDUAL"),
            "hydrogen_decay.csv": [
                {"time_s": 0.0, "total_h2_mg_L": 2.0, "uncertainty_mg_L": 0.1},
                {"time_s": 60.0, "total_h2_mg_L": 1.8, "uncertainty_mg_L": 0.1},
            ],
        },
        calibration_references=[calibration("GC-CAL-RESIDUAL")],
    )
    residual_review = client.patch(
        f"/api/v1/test-runs/{residual_draft['id']}",
        json={"expected_updated_at": residual_draft["updated_at"], "status": "valid"},
    )
    assert residual_review.status_code == 422
    assert "0.5%" in residual_review.json()["detail"]

    # Even a database-corrupted review state is revalidated at export time.
    with application.state.database.session() as session:
        stored = session.get(OrmTestRunRecord, draft["id"])
        assert stored is not None
        stored.status = "valid"
        stored.calibrations_json = []
    corrupted = client.get(f"/api/v1/test-runs/{draft['id']}").json()
    exported = client.get(
        f"/api/v1/test-runs/{draft['id']}/export",
        params={
            "format": "reviewed_csv",
            "expected_updated_at": corrupted["updated_at"],
        },
    )
    assert exported.status_code == 409
    assert "validation failed" in exported.json()["detail"].lower()


def test_csv_import_hash_storage_validation_and_owned_cleanup(
    api_client: tuple[TestClient, FastAPI, Path],
) -> None:
    client, _application, attachments = api_client
    csv_data = "time_s,total_h2_mg_L,uncertainty_mg_L\n0,2.2,0.1\n60,1.9,0.1\n"
    imported = client.post(
        "/api/v1/test-runs/import",
        params={"calibration_reference": "GC-CAL-2026-08-24"},
        headers={"X-Filename": "hydrogen_decay.csv", "Content-Type": "text/csv"},
        content=csv_data,
    )
    assert imported.status_code == 201, imported.text
    document = imported.json()
    run = document["test_run"]
    assert run["status"] == "needs_review"
    assert len(run["measurements"]["hydrogen_decay.csv"]) == 2
    assert len(document["attachment"]["sha256"]) == 64
    owned_files = list(attachments.iterdir())
    assert len(owned_files) == 1
    assert owned_files[0].name not in {"hydrogen_decay.csv", "../hydrogen_decay.csv"}

    formula = client.post(
        "/api/v1/test-runs/import",
        params={"calibration_reference": "GC-CAL-2026-08-24"},
        headers={"X-Filename": "hydrogen_decay.csv", "Content-Type": "text/csv"},
        content=("time_s,total_h2_mg_L,uncertainty_mg_L\n0,+2.2,0.1\n"),
    )
    assert formula.status_code == 422
    assert formula.json()["detail"]["field"] == "total_h2_mg_L"

    deleted = client.delete(
        f"/api/v1/test-runs/{run['id']}",
        params={"confirm": True, "expected_updated_at": run["updated_at"]},
    )
    assert deleted.status_code == 200
    assert deleted.json()["owned_attachments_removed"] == 1
    assert list(attachments.iterdir()) == []


def test_evidence_requires_complete_provenance_and_owned_local_reference(
    api_client: tuple[TestClient, FastAPI, Path],
) -> None:
    client, _application, _attachments = api_client
    incomplete = client.post(
        "/api/v1/test-runs",
        json={
            "name": "Incomplete evidence",
            "evidence": [{"kind": "measured", "title": "Missing method metadata"}],
        },
    )
    assert incomplete.status_code == 422

    both_sources = evidence_payload(local_attachment="attachment-id")
    both = client.post(
        "/api/v1/test-runs",
        json={"name": "Ambiguous evidence", "evidence": [both_sources]},
    )
    assert both.status_code == 422

    path_reference = evidence_payload(url=None, local_attachment="../../private/data.csv")
    path = client.post(
        "/api/v1/test-runs",
        json={"name": "Path evidence", "evidence": [path_reference]},
    )
    assert path.status_code == 422

    owner = create_run(client, name="Attachment owner")
    imported = client.post(
        "/api/v1/test-runs/import",
        params={
            "test_run_id": owner["id"],
            "expected_updated_at": owner["updated_at"],
            "calibration_reference": "GC-CAL-EVIDENCE",
        },
        headers={"X-Filename": "hydrogen_decay.csv", "Content-Type": "text/csv"},
        content="time_s,total_h2_mg_L,uncertainty_mg_L\n0,2.2,0.1\n",
    )
    assert imported.status_code == 201
    attachment_id = imported.json()["attachment"]["id"]

    other = create_run(client, name="Other test run")
    foreign_reference = evidence_payload(url=None, local_attachment=attachment_id)
    rejected = client.patch(
        f"/api/v1/test-runs/{other['id']}",
        json={
            "expected_updated_at": other["updated_at"],
            "evidence": [foreign_reference],
        },
    )
    assert rejected.status_code == 422
    assert "owned by this test run" in rejected.json()["detail"]

    accepted = client.patch(
        f"/api/v1/test-runs/{owner['id']}",
        json={
            "expected_updated_at": imported.json()["test_run"]["updated_at"],
            "evidence": [foreign_reference],
        },
    )
    assert accepted.status_code == 200, accepted.text
    assert accepted.json()["evidence"][0]["local_attachment"] == attachment_id


def test_multipart_import_and_reviewed_csv_export(
    api_client: tuple[TestClient, FastAPI, Path],
) -> None:
    client, _application, _attachments = api_client
    run = create_run(
        client,
        status="draft",
        measurements={
            "pressure_trace.csv": [
                {
                    "crank_angle_deg": -180.0,
                    "pressure_bar": 1.0,
                    "uncertainty_bar": 0.02,
                },
                {
                    "crank_angle_deg": 0.0,
                    "pressure_bar": 30.0,
                    "uncertainty_bar": 0.1,
                },
            ]
        },
        calibration_references=[calibration("PRESSURE-CAL", "pressure_trace.csv")],
    )
    imported = client.post(
        "/api/v1/test-runs/import",
        params={"expected_updated_at": run["updated_at"]},
        files={
            "file": (
                "bubble_distribution.csv",
                "diameter_nm,number_per_mL\n100,100000000\n200,50000000\n",
                "text/csv",
            )
        },
        data={
            "test_run_id": run["id"],
            "calibration_reference": "NTA-CAL-2026-08-24",
        },
    )
    assert imported.status_code == 201, imported.text
    assert imported.json()["test_run"]["status"] == "needs_review"

    reviewed = client.patch(
        f"/api/v1/test-runs/{run['id']}",
        json={
            "expected_updated_at": imported.json()["test_run"]["updated_at"],
            "status": "valid",
        },
    )
    assert reviewed.status_code == 200

    exported = client.get(
        f"/api/v1/test-runs/{run['id']}/export",
        params={
            "format": "reviewed_csv",
            "expected_updated_at": reviewed.json()["updated_at"],
        },
    )
    assert exported.status_code == 200, exported.text
    with ZipFile(io.BytesIO(exported.content)) as archive:
        assert set(archive.namelist()) == {
            "bubble_distribution.csv",
            "pressure_trace.csv",
        }
        pressure = archive.read("pressure_trace.csv").decode()
    assert pressure.startswith("crank_angle_deg,pressure_bar,uncertainty_bar\n")


def test_canonical_json_export_round_trip_preserves_content_hash(
    api_client: tuple[TestClient, FastAPI, Path],
) -> None:
    client, _application, _attachments = api_client
    original = create_run(
        client,
        name="Round-trip run",
        status="draft",
    )
    pressure_csv = "crank_angle_deg,pressure_bar,uncertainty_bar\n-180,1.0,0.02\n0,30.0,0.1\n"
    source_import = client.post(
        "/api/v1/test-runs/import",
        params={
            "test_run_id": original["id"],
            "expected_updated_at": original["updated_at"],
            "calibration_reference": "PRESSURE-CAL-ROUNDTRIP",
        },
        headers={"X-Filename": "pressure_trace.csv", "Content-Type": "text/csv"},
        content=pressure_csv,
    )
    assert source_import.status_code == 201, source_import.text
    source_attachment = source_import.json()["test_run"]["attachments"][0]
    reviewed = client.patch(
        f"/api/v1/test-runs/{original['id']}",
        json={
            "expected_updated_at": source_import.json()["test_run"]["updated_at"],
            "status": "valid",
            "evidence": [
                {
                    "kind": "literature",
                    "title": "Round-trip evidence sentinel",
                    "author_or_publisher": "Test fixture",
                    "publication_date": "2026-08-24",
                    "url": "https://example.com/evidence",
                    "method": "hash comparison",
                    "value_or_range": "one canonical sentinel",
                    "unit": "qualitative",
                    "uncertainty": "test-only evidence fixture",
                    "applicability_note": "Exercises canonical evidence serialization.",
                },
                {
                    "kind": "measured",
                    "title": "Pressure attachment evidence",
                    "author_or_publisher": "HydroCycle test fixture",
                    "publication_date": "2026-08-24",
                    "local_attachment": source_attachment["id"],
                    "method": "calibrated pressure trace",
                    "value_or_range": "1 to 30",
                    "unit": "bar",
                    "uncertainty": "0.02 to 0.1 bar standard uncertainty",
                    "applicability_note": "Applies only to the attached synthetic test trace.",
                },
            ],
        },
    )
    assert reviewed.status_code == 200, reviewed.text
    original = reviewed.json()
    simulation_input = default_simulation_input("artificial_pass")
    simulation_input.uncertainty.enabled = False
    evaluated = client.post(
        "/api/v1/simulations",
        params={"persist": "true", "test_run_id": original["id"]},
        json=simulation_input.model_dump(mode="json"),
    )
    assert evaluated.status_code == 200, evaluated.text
    result_id = evaluated.json()["result_id"]
    current_original = client.get(f"/api/v1/test-runs/{original['id']}").json()
    exported = client.get(
        f"/api/v1/test-runs/{original['id']}/export",
        params={"format": "json", "expected_updated_at": current_original["updated_at"]},
    )
    assert exported.status_code == 200
    assert len(exported.headers["x-content-sha256"]) == 64

    imported = client.post(
        "/api/v1/test-runs/import",
        headers={"X-Filename": "test_run.json", "Content-Type": "application/json"},
        content=exported.content,
    )
    assert imported.status_code == 201, imported.text
    imported_document = imported.json()
    restored = imported_document["test_run"]
    assert restored["id"] != original["id"]
    assert restored["name"] == original["name"]
    assert restored["status"] == "valid"
    assert restored["measurements"]["headspace_gc_mg_l"] is None
    assert {item["title"] for item in restored["evidence"]} == {
        "Round-trip evidence sentinel",
        "Pressure attachment evidence",
    }
    assert restored["simulation_ids"] == [result_id]
    assert imported_document["imported_simulations"] == [
        {"source_id": result_id, "persisted_id": result_id}
    ]
    restored_source = next(
        item for item in restored["attachments"] if item["sha256"] == source_attachment["sha256"]
    )
    assert restored_source["locally_owned"] is False
    assert restored_source["canonical_name"] == source_attachment["canonical_name"]
    assert restored_source["size_bytes"] == source_attachment["size_bytes"]
    provenance = restored_source["metadata"]["_hydrocycle_import_provenance"]
    assert provenance["source_attachment_id"] == source_attachment["id"]
    uploaded_json = next(
        item
        for item in restored["attachments"]
        if item["id"] == imported_document["attachment"]["id"]
    )
    assert uploaded_json["locally_owned"] is True
    local_evidence = next(
        item for item in restored["evidence"] if item["local_attachment"] is not None
    )
    assert local_evidence["local_attachment"] == restored_source["id"]


def test_canonical_import_rejects_forged_simulation_id_and_embedded_result(
    api_client: tuple[TestClient, FastAPI, Path],
) -> None:
    client, _application, _attachments = api_client
    source_run = create_run(client, name="Deterministic import source")
    simulation_input = default_simulation_input("artificial_pass")
    simulation_input.uncertainty.enabled = False
    evaluated = client.post(
        "/api/v1/simulations",
        params={"persist": "true", "test_run_id": source_run["id"]},
        json=simulation_input.model_dump(mode="json"),
    )
    assert evaluated.status_code == 200
    current_source = client.get(f"/api/v1/test-runs/{source_run['id']}").json()
    exported = client.get(
        f"/api/v1/test-runs/{source_run['id']}/export",
        params={"format": "json", "expected_updated_at": current_source["updated_at"]},
    )
    assert exported.status_code == 200
    original = json.loads(exported.content)
    before_ids = {item["id"] for item in client.get("/api/v1/test-runs").json()}

    forged_id = json.loads(json.dumps(original))
    forged_id["simulations"][0]["id"] = "f" * 64
    id_response = client.post(
        "/api/v1/test-runs/import",
        headers={"X-Filename": "test_run.json", "Content-Type": "application/json"},
        content=canonical_json_bytes(forged_id),
    )
    assert id_response.status_code == 422
    assert id_response.json()["detail"]["field"] == "simulations[0].id"

    forged_result = json.loads(json.dumps(original))
    available = forged_result["simulations"][0]["result"]["gate"]["hydrogen_available"]
    available["value"] += 1.0
    result_response = client.post(
        "/api/v1/test-runs/import",
        headers={"X-Filename": "test_run.json", "Content-Type": "application/json"},
        content=canonical_json_bytes(forged_result),
    )
    assert result_response.status_code == 422
    assert result_response.json()["detail"]["field"] == "simulations[0].result"

    after_ids = {item["id"] for item in client.get("/api/v1/test-runs").json()}
    assert after_ids == before_ids
    assert client.get(f"/api/v1/simulations/{'f' * 64}").status_code == 404


def test_persisted_pass_simulation_and_neutral_0d_boundary_export(
    api_client: tuple[TestClient, FastAPI, Path],
) -> None:
    client, application, _attachments = api_client
    run = create_run(client, name="Synthetic pass boundary", status="draft")
    simulation_input = default_simulation_input("artificial_pass")
    simulation_input.uncertainty.enabled = False
    evaluated = client.post(
        "/api/v1/simulations",
        params={"persist": "true", "test_run_id": run["id"]},
        json=simulation_input.model_dump(mode="json"),
    )
    assert evaluated.status_code == 200, evaluated.text
    result = evaluated.json()
    assert result["gate"]["passed"] is True
    assert result["proposed_cycle"] is not None
    assert len(result["result_id"]) == 64
    assert result["sensitivity"] == result["uncertainty"]["sensitivities"]
    with application.state.database.session() as session:
        persisted_evidence = session.scalars(
            select(OrmEvidenceRecord).where(OrmEvidenceRecord.simulation_id == result["result_id"])
        ).all()
    assert len(persisted_evidence) == len(result["evidence"])
    assert {item.kind for item in persisted_evidence} <= {
        "measured",
        "literature",
        "user_assumption",
    }
    linked_run = client.get(f"/api/v1/test-runs/{run['id']}")
    assert linked_run.status_code == 200
    link_comparison = linked_run.json()["comparisons"]["items"][0]
    assert link_comparison["id"] == f"simulation:{result['result_id']}:modeled_total_h2"
    assert link_comparison["simulation_id"] == result["result_id"]
    assert link_comparison["measured_value"] is None
    assert link_comparison["modeled_value"] == result["loading"]["total_h2_mg_l"]["value"]

    retrieved = client.get(f"/api/v1/simulations/{result['result_id']}")
    assert retrieved.status_code == 200
    assert retrieved.json()["reproducibility"] == result["reproducibility"]

    exported = client.get(
        f"/api/v1/test-runs/{run['id']}/export",
        params={
            "format": "cfd_boundary",
            "simulation_id": result["result_id"],
            "expected_updated_at": linked_run.json()["updated_at"],
        },
    )
    assert exported.status_code == 200, exported.text
    boundary = CfdBoundaryExport.model_validate(exported.json())
    assert boundary.export_kind == "homogeneous_0d_boundary_only"
    assert len(boundary.states) > 2
    assert "velocity_field" in boundary.missing_fields
    first_total = sum(boundary.states[0].mole_fractions.values())
    assert first_total == pytest.approx(1.0)

    other_run = create_run(client, name="Conflicting deterministic link")
    relinked = client.post(
        "/api/v1/simulations",
        params={"persist": "true", "test_run_id": other_run["id"]},
        json=simulation_input.model_dump(mode="json"),
    )
    assert relinked.status_code == 200
    assert relinked.json()["result_id"] == result["result_id"]
    second_export = client.get(
        f"/api/v1/test-runs/{other_run['id']}/export",
        params={
            "format": "cfd_boundary",
            "simulation_id": result["result_id"],
            "expected_updated_at": client.get(f"/api/v1/test-runs/{other_run['id']}").json()[
                "updated_at"
            ],
        },
    )
    assert second_export.status_code == 200


def test_persisted_simulation_comparison_is_typed_deterministic_and_exported(
    api_client: tuple[TestClient, FastAPI, Path],
) -> None:
    client, _application, _attachments = api_client
    scalar_run = create_run(
        client,
        name="Scalar comparison run",
        measurements={"total_h2_mg_l": measured(2.1, "mg/L", "GC-CAL-COMPARISON")},
        calibration_references=[calibration("GC-CAL-COMPARISON")],
        comparisons={
            "items": [
                {
                    "id": "operator-comparison",
                    "kind": "retention",
                    "label": "Operator comparison sentinel",
                    "measured_value": 0.7,
                    "modeled_value": 0.68,
                    "unit": "1",
                }
            ]
        },
    )
    simulation_input = default_simulation_input("artificial_pass")
    simulation_input.uncertainty.enabled = False
    first = client.post(
        "/api/v1/simulations",
        params={"test_run_id": scalar_run["id"]},
        json=simulation_input.model_dump(mode="json"),
    )
    assert first.status_code == 200, first.text
    result = first.json()

    retrieved = client.get(f"/api/v1/test-runs/{scalar_run['id']}")
    assert retrieved.status_code == 200
    comparisons = retrieved.json()["comparisons"]["items"]
    assert [item["id"] for item in comparisons] == [
        "operator-comparison",
        f"simulation:{result['result_id']}:total_h2",
    ]
    generated = comparisons[1]
    assert generated["kind"] == "simulation"
    assert generated["simulation_id"] == result["result_id"]
    assert generated["measured_value"] == pytest.approx(2.1)
    assert generated["modeled_value"] == result["loading"]["total_h2_mg_l"]["value"]
    assert generated["unit"] == "mg/L"
    assert result["reproducibility"]["model_version"] in generated["notes"]

    repeated = client.post(
        "/api/v1/simulations",
        params={"test_run_id": scalar_run["id"]},
        json=simulation_input.model_dump(mode="json"),
    )
    assert repeated.status_code == 200
    repeated_comparisons = client.get(f"/api/v1/test-runs/{scalar_run['id']}").json()[
        "comparisons"
    ]["items"]
    assert repeated_comparisons == comparisons

    current_scalar = client.get(f"/api/v1/test-runs/{scalar_run['id']}").json()
    exported = client.get(
        f"/api/v1/test-runs/{scalar_run['id']}/export",
        params={"format": "json", "expected_updated_at": current_scalar["updated_at"]},
    )
    assert exported.status_code == 200
    assert exported.json()["test_run"]["comparisons"]["items"] == comparisons

    series_run = create_run(
        client,
        name="Pressure-series comparison run",
        measurements={
            "pressure_trace.csv": [
                {
                    "crank_angle_deg": -180.0,
                    "pressure_bar": 1.0,
                    "uncertainty_bar": 0.02,
                },
                {
                    "crank_angle_deg": 0.0,
                    "pressure_bar": 30.0,
                    "uncertainty_bar": 0.1,
                },
            ]
        },
    )
    series_result = client.post(
        "/api/v1/simulations",
        params={"test_run_id": series_run["id"]},
        json=simulation_input.model_dump(mode="json"),
    )
    assert series_result.status_code == 200, series_result.text
    series_comparison = client.get(f"/api/v1/test-runs/{series_run['id']}").json()["comparisons"][
        "items"
    ][0]
    assert series_comparison["simulation_id"] == series_result.json()["result_id"]
    assert series_comparison["id"] == (
        f"simulation:{series_result.json()['result_id']}:peak_pressure"
    )
    assert series_comparison["measured_value"] == pytest.approx(30.0)
    assert series_comparison["modeled_value"] == pytest.approx(
        max(series_result.json()["proposed_cycle"]["pressure_pa"]) / 100_000.0
    )
    assert series_comparison["unit"] == "bar"

    mixed_run = create_run(
        client,
        name="Mixed comparison run",
        measurements={
            "headspace_gc_mg_l": measured(2.2, "mg/L", "MIXED-CAL"),
            "retained_h2_mg_l": measured(1.4, "mg/L", "MIXED-CAL"),
            "retention_fraction": measured(0.64, "1", "MIXED-CAL"),
            "pressure_trace.csv": [
                {
                    "crank_angle_deg": -180.0,
                    "pressure_bar": 1.0,
                    "uncertainty_bar": 0.02,
                },
                {
                    "crank_angle_deg": 0.0,
                    "pressure_bar": 31.0,
                    "uncertainty_bar": 0.1,
                },
            ],
        },
        calibration_references=[calibration("MIXED-CAL", "pressure_trace.csv")],
        comparisons={
            "items": [
                {
                    "id": "operator-mixed-comparison",
                    "kind": "retention",
                    "label": "Operator mixed comparison sentinel",
                    "measured_value": 0.6,
                    "modeled_value": 0.58,
                    "unit": "1",
                }
            ]
        },
    )
    mixed_response = client.post(
        "/api/v1/simulations",
        params={"test_run_id": mixed_run["id"]},
        json=simulation_input.model_dump(mode="json"),
    )
    assert mixed_response.status_code == 200, mixed_response.text
    mixed_result = mixed_response.json()
    mixed_result_id = mixed_result["result_id"]

    legacy_patch = client.patch(
        f"/api/v1/test-runs/{mixed_run['id']}",
        json={
            "expected_updated_at": client.get(f"/api/v1/test-runs/{mixed_run['id']}").json()[
                "updated_at"
            ],
            "comparisons": {
                "items": [
                    {
                        "id": "operator-mixed-comparison",
                        "kind": "retention",
                        "label": "Operator mixed comparison sentinel",
                        "measured_value": 0.6,
                        "modeled_value": 0.58,
                        "unit": "1",
                    },
                    {
                        "id": "operator-simulation-comparison",
                        "kind": "simulation",
                        "label": "Operator simulation comparison sentinel",
                        "simulation_id": mixed_result_id,
                        "measured_value": 0.5,
                        "modeled_value": 0.48,
                        "unit": "1",
                    },
                    {
                        "id": f"simulation:{mixed_result_id}:operator-note",
                        "kind": "simulation",
                        "label": "Operator prefixed comparison sentinel",
                        "simulation_id": mixed_result_id,
                        "measured_value": 0.4,
                        "modeled_value": 0.38,
                        "unit": "1",
                    },
                    {
                        "id": f"simulation:{mixed_result_id}",
                        "kind": "simulation",
                        "label": "Legacy generated comparison",
                        "simulation_id": mixed_result_id,
                        "measured_value": 999.0,
                        "modeled_value": 999.0,
                        "unit": "mg/L",
                    },
                ]
            },
        },
    )
    assert legacy_patch.status_code == 200, legacy_patch.text

    relinked_mixed = client.post(
        "/api/v1/simulations",
        params={"test_run_id": mixed_run["id"]},
        json=simulation_input.model_dump(mode="json"),
    )
    assert relinked_mixed.status_code == 200, relinked_mixed.text
    mixed_comparisons = client.get(f"/api/v1/test-runs/{mixed_run['id']}").json()["comparisons"][
        "items"
    ]
    assert [item["id"] for item in mixed_comparisons] == [
        "operator-mixed-comparison",
        "operator-simulation-comparison",
        f"simulation:{mixed_result_id}:operator-note",
        f"simulation:{mixed_result_id}:total_h2",
        f"simulation:{mixed_result_id}:retained_h2",
        f"simulation:{mixed_result_id}:retention_fraction",
        f"simulation:{mixed_result_id}:peak_pressure",
    ]
    assert mixed_comparisons[1]["kind"] == "simulation"
    assert mixed_comparisons[1]["simulation_id"] == mixed_result_id
    assert [item["measured_value"] for item in mixed_comparisons[3:]] == pytest.approx(
        [2.2, 1.4, 0.64, 31.0]
    )
    assert (
        mixed_comparisons[3]["modeled_value"] == mixed_result["loading"]["total_h2_mg_l"]["value"]
    )
    assert (
        mixed_comparisons[4]["modeled_value"]
        == mixed_result["retention"]["retained_at_intake_mg_l"]["value"]
    )
    assert (
        mixed_comparisons[5]["modeled_value"]
        == mixed_result["retention"]["retained_fraction"]["value"]
    )
    assert mixed_comparisons[6]["modeled_value"] == pytest.approx(
        max(mixed_result["proposed_cycle"]["pressure_pa"]) / 100_000.0
    )


def test_delete_never_unlinks_non_owned_attachment(
    api_client: tuple[TestClient, FastAPI, Path], tmp_path: Path
) -> None:
    client, application, _attachments = api_client
    run = create_run(client, name="External attachment sentinel")
    sentinel = tmp_path / "outside-owned-storage.csv"
    sentinel.write_text("must remain")
    database = application.state.database
    with database.session() as session:
        session.add(
            AttachmentRecord(
                id=str(uuid4()),
                test_run_id=run["id"],
                canonical_name="pressure_trace.csv",
                storage_name="external-sentinel.csv",
                mime_type="text/csv",
                size_bytes=sentinel.stat().st_size,
                sha256="0" * 64,
                locally_owned=False,
                metadata_json={"external_reference": True},
                import_warnings_json=[],
            )
        )

    deleted = client.delete(
        f"/api/v1/test-runs/{run['id']}",
        params={"confirm": True, "expected_updated_at": run["updated_at"]},
    )
    assert deleted.status_code == 200
    assert deleted.json()["owned_attachments_removed"] == 0
    assert sentinel.read_text() == "must remain"


def test_openapi_has_no_hardware_command_surface(
    api_client: tuple[TestClient, FastAPI, Path],
) -> None:
    client, application, _attachments = api_client
    openapi = application.openapi()
    paths = openapi["paths"]
    assert "CfdBoundaryExport" in openapi["components"]["schemas"]
    assert "TestRunDocument" in openapi["components"]["schemas"]
    for schema_name in (
        "CalibrationReference",
        "EvidenceInput",
        "MeasuredValue",
        "MeasurementRecord",
        "TestRun",
        "TestRunMeasurements",
    ):
        assert schema_name in openapi["components"]["schemas"]
    lowered = "\n".join(paths).casefold()
    for forbidden in ("actuator", "ignition", "injector", "throttle", "command"):
        assert forbidden not in lowered

    public_routes = {route.path for route in application.routes if getattr(route, "methods", None)}
    assert public_routes
    assert all(path.startswith("/api/v1/") for path in public_routes)
    for disabled_path in ("/openapi.json", "/docs", "/docs/oauth2-redirect", "/redoc"):
        assert client.get(disabled_path).status_code == 404

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import pytest

from hydrocycle.imports import (
    MAX_IMPORT_BYTES,
    ImportValidationError,
    parse_import,
    remove_owned_attachment,
    save_owned_attachment,
)


def parse_csv(filename: str, text: str) -> object:
    return parse_import(
        filename=filename,
        content_type="text/csv",
        raw_bytes=text.encode(),
        calibration_reference="CAL-2026-08-24 / method v1",
    )


@pytest.mark.parametrize(
    ("filename", "text", "row_count"),
    [
        (
            "hydrogen_decay.csv",
            "time_s,total_h2_mg_L,uncertainty_mg_L\n0,2.2,0.1\n60,1.9,0.1\n",
            2,
        ),
        (
            "bubble_distribution.csv",
            "diameter_nm,number_per_mL\n100,100000000\n200,50000000\n",
            2,
        ),
        (
            "pressure_trace.csv",
            "crank_angle_deg,pressure_bar,uncertainty_bar\n-180,1.0,0.02\n0,30,0.1\n",
            2,
        ),
    ],
)
def test_canonical_csv_contracts(filename: str, text: str, row_count: int) -> None:
    parsed = parse_csv(filename, text)
    assert parsed.canonical_name == filename
    assert len(parsed.data) == row_count
    assert parsed.calibration_reference == "CAL-2026-08-24 / method v1"
    assert parsed.sha256 == hashlib.sha256(text.encode()).hexdigest()


@pytest.mark.parametrize(
    ("filename", "text", "field"),
    [
        (
            "hydrogen_decay.csv",
            "time_s,total_h2_mg_L\n0,2.2\n",
            "headers",
        ),
        (
            "hydrogen_decay.csv",
            "time_s,total_h2_mg_L,uncertainty_mg_L\n0,+2.2,0.1\n",
            "total_h2_mg_L",
        ),
        (
            "hydrogen_decay.csv",
            "time_s,total_h2_mg_L,uncertainty_mg_L\n0,nan,0.1\n",
            "total_h2_mg_L",
        ),
        (
            "hydrogen_decay.csv",
            "time_s,total_h2_mg_L,uncertainty_mg_L\n0,2.2,0.1\n0,2.0,0.1\n",
            "time_s",
        ),
        (
            "pressure_trace.csv",
            "crank_angle_deg,pressure_bar,uncertainty_bar\n0,1,0.1\n-1,1,0.1\n",
            "crank_angle_deg",
        ),
        (
            "bubble_distribution.csv",
            "diameter_nm,number_per_mL\n0,1\n",
            "diameter_nm",
        ),
    ],
)
def test_csv_rejects_malformed_or_unsafe_values(filename: str, text: str, field: str) -> None:
    with pytest.raises(ImportValidationError) as captured:
        parse_csv(filename, text)
    assert captured.value.field == field


def test_csv_requires_calibration_reference() -> None:
    with pytest.raises(ImportValidationError, match="calibration"):
        parse_import(
            filename="pressure_trace.csv",
            content_type="text/csv",
            raw_bytes=(b"crank_angle_deg,pressure_bar,uncertainty_bar\n0,1.0,0.1\n"),
        )


@pytest.mark.parametrize("filename", ["../pressure_trace.csv", "folder\\pressure_trace.csv"])
def test_import_filename_rejects_path_traversal(filename: str) -> None:
    with pytest.raises(ImportValidationError, match="path"):
        parse_import(
            filename=filename,
            content_type="text/csv",
            raw_bytes=b"x\n1\n",
            calibration_reference="CAL-1",
        )


def test_import_is_bounded_by_bytes() -> None:
    with pytest.raises(ImportValidationError, match="byte limit"):
        parse_import(
            filename="test_run.json",
            content_type="application/json",
            raw_bytes=b"x" * (MAX_IMPORT_BYTES + 1),
        )


def test_canonical_json_preserves_null_and_verifies_hash() -> None:
    body = {
        "schema_version": "1.0.0",
        "test_run": {
            "name": "Reviewed reference run",
            "status": "valid",
            "measurements": {"not_measured": None},
        },
        "simulations": [],
    }
    canonical = json.dumps(body, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode()
    body["content_sha256"] = hashlib.sha256(canonical).hexdigest()
    raw = json.dumps(body).encode()

    parsed = parse_import(filename="test_run.json", content_type="application/json", raw_bytes=raw)
    assert parsed.warnings == ()
    assert parsed.data["test_run"]["measurements"]["not_measured"] is None

    body["test_run"]["name"] = "Tampered"
    with pytest.raises(ImportValidationError, match="does not match"):
        parse_import(
            filename="test_run.json",
            content_type="application/json",
            raw_bytes=json.dumps(body).encode(),
        )


def test_json_rejects_formulas_nonfinite_and_filesystem_paths() -> None:
    for body, match in (
        ({"name": "=cmd()"}, "formulas"),
        ({"name": "run", "value": float("inf")}, "Non-finite"),
        ({"name": "run", "file_path": "../../private"}, "path fields"),
    ):
        with pytest.raises(ImportValidationError, match=match):
            parse_import(
                filename="test_run.json",
                content_type="application/json",
                raw_bytes=json.dumps(body).encode(),
            )


def test_owned_attachment_never_deletes_outside_storage(tmp_path: Path) -> None:
    parsed = parse_csv(
        "hydrogen_decay.csv",
        "time_s,total_h2_mg_L,uncertainty_mg_L\n0,2.2,0.1\n",
    )
    owned_root = tmp_path / "owned"
    storage_name = save_owned_attachment(owned_root, parsed)
    assert (owned_root / storage_name).is_file()
    assert remove_owned_attachment(owned_root, storage_name)

    external = tmp_path / "external.csv"
    external.write_text("preserve me")
    assert not remove_owned_attachment(owned_root, "../external.csv")
    assert external.read_text() == "preserve me"

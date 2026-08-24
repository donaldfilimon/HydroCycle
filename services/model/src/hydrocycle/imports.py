"""Bounded, data-only import validation and owned attachment storage."""

from __future__ import annotations

import csv
import hashlib
import io
import json
import math
import re
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Final
from uuid import uuid4

MAX_IMPORT_BYTES: Final = 2 * 1024 * 1024
MAX_IMPORT_ROWS: Final = 10_000
MAX_JSON_NODES: Final = 50_000
MAX_JSON_DEPTH: Final = 20

JSON_FILENAMES: Final = frozenset({"test_run.json", "hydrocycle_test_run.json"})
CSV_HEADERS: Final[dict[str, tuple[str, ...]]] = {
    "hydrogen_decay.csv": ("time_s", "total_h2_mg_L", "uncertainty_mg_L"),
    "bubble_distribution.csv": ("diameter_nm", "number_per_mL"),
    "pressure_trace.csv": (
        "crank_angle_deg",
        "pressure_bar",
        "uncertainty_bar",
    ),
}
ALLOWED_MIME_TYPES: Final[dict[str, frozenset[str]]] = {
    "json": frozenset({"application/json", "text/json", "application/octet-stream"}),
    "csv": frozenset(
        {
            "text/csv",
            "application/csv",
            "application/vnd.ms-excel",
            "application/octet-stream",
        }
    ),
}
STATUSES: Final = frozenset({"draft", "needs_review", "valid", "invalid"})
_STORAGE_NAME = re.compile(r"^[0-9a-f]{32}\.(?:json|csv)$")
_PATH_KEYS = frozenset({"path", "file_path", "filesystem_path", "storage_path"})


class ImportValidationError(ValueError):
    """A safe, user-correctable import error."""

    def __init__(self, message: str, *, field: str | None = None) -> None:
        super().__init__(message)
        self.message = message
        self.field = field

    def as_detail(self) -> dict[str, str]:
        detail = {"message": self.message}
        if self.field is not None:
            detail["field"] = self.field
        return detail


@dataclass(frozen=True, slots=True)
class ParsedImport:
    canonical_name: str
    kind: str
    mime_type: str
    sha256: str
    size_bytes: int
    raw_bytes: bytes
    data: dict[str, Any] | list[dict[str, float]]
    calibration_reference: str | None
    warnings: tuple[str, ...] = ()


def _reject_json_constant(value: str) -> None:
    raise ImportValidationError(f"Non-finite JSON number {value!r} is not allowed", field="json")


def validate_canonical_filename(filename: str) -> str:
    """Reject traversal and accept only the declared import contracts."""

    if not filename or "\x00" in filename:
        raise ImportValidationError("A canonical import filename is required", field="filename")
    if Path(filename).name != filename or "/" in filename or "\\" in filename:
        raise ImportValidationError("Import filenames must not contain a path", field="filename")
    if filename not in JSON_FILENAMES and filename not in CSV_HEADERS:
        allowed = sorted((*JSON_FILENAMES, *CSV_HEADERS))
        raise ImportValidationError(
            f"Unsupported filename; expected one of {', '.join(allowed)}",
            field="filename",
        )
    return filename


def _has_formula_prefix(value: str) -> bool:
    stripped = value.lstrip()
    if not stripped:
        return False
    if stripped[0] in {"=", "+", "@"}:
        return True
    return bool(re.match(r"^-[A-Za-z'\"]", stripped))


def _validate_text(value: str, *, field: str, max_length: int = 20_000) -> None:
    if len(value) > max_length:
        raise ImportValidationError(f"Text exceeds the {max_length}-character limit", field=field)
    if "\x00" in value or any(ord(char) < 32 and char not in "\t\r\n" for char in value):
        raise ImportValidationError("Control characters are not allowed", field=field)
    if _has_formula_prefix(value):
        raise ImportValidationError(
            "Spreadsheet formulas or executable cell prefixes are not allowed",
            field=field,
        )


def _validate_json_tree(
    value: Any,
    *,
    field: str = "json",
    depth: int = 0,
    counter: list[int] | None = None,
) -> None:
    if counter is None:
        counter = [0]
    counter[0] += 1
    if counter[0] > MAX_JSON_NODES:
        raise ImportValidationError(f"JSON exceeds the {MAX_JSON_NODES}-node limit", field=field)
    if depth > MAX_JSON_DEPTH:
        raise ImportValidationError(f"JSON nesting exceeds {MAX_JSON_DEPTH} levels", field=field)

    if value is None or isinstance(value, (bool, int)):
        return
    if isinstance(value, float):
        if not math.isfinite(value):
            raise ImportValidationError("Non-finite numbers are not allowed", field=field)
        return
    if isinstance(value, str):
        _validate_text(value, field=field)
        return
    if isinstance(value, list):
        for index, child in enumerate(value):
            _validate_json_tree(
                child,
                field=f"{field}[{index}]",
                depth=depth + 1,
                counter=counter,
            )
        return
    if isinstance(value, dict):
        for key, child in value.items():
            if not isinstance(key, str):
                raise ImportValidationError("JSON object keys must be text", field=field)
            _validate_text(key, field=f"{field}.key", max_length=200)
            if key.casefold() in _PATH_KEYS:
                raise ImportValidationError(
                    "Filesystem path fields are not accepted in imports",
                    field=f"{field}.{key}",
                )
            _validate_json_tree(
                child,
                field=f"{field}.{key}",
                depth=depth + 1,
                counter=counter,
            )
        return
    raise ImportValidationError(
        f"Unsupported JSON value of type {type(value).__name__}", field=field
    )


def _parse_json(raw: bytes) -> tuple[dict[str, Any], tuple[str, ...]]:
    try:
        text = raw.decode("utf-8")
    except UnicodeDecodeError as error:
        raise ImportValidationError("JSON must be UTF-8", field="encoding") from error
    try:
        payload = json.loads(text, parse_constant=_reject_json_constant)
    except ImportValidationError:
        raise
    except json.JSONDecodeError as error:
        raise ImportValidationError(
            f"Invalid JSON at line {error.lineno}, column {error.colno}", field="json"
        ) from error
    if not isinstance(payload, dict):
        raise ImportValidationError("Canonical JSON must be an object", field="json")
    _validate_json_tree(payload)

    run = payload.get("test_run", payload)
    if not isinstance(run, dict):
        raise ImportValidationError("test_run must be an object", field="test_run")
    name = run.get("name")
    if not isinstance(name, str) or not name.strip():
        raise ImportValidationError("A non-empty test run name is required", field="name")
    _validate_text(name, field="name", max_length=200)
    status = run.get("status", "needs_review")
    if status not in STATUSES:
        raise ImportValidationError(
            "status must be draft, needs_review, valid, or invalid", field="status"
        )
    for key in (
        "provenance",
        "measurements",
        "calibration_references",
        "comparisons",
        "evidence",
    ):
        if key in run and run[key] is not None and not isinstance(run[key], (dict, list)):
            raise ImportValidationError(f"{key} must be an object or array", field=key)
    warnings: list[str] = []
    supplied_hash = payload.get("content_sha256")
    if supplied_hash is None:
        warnings.append("canonical_json_has_no_content_hash")
    elif not isinstance(supplied_hash, str) or not re.fullmatch(r"[0-9a-f]{64}", supplied_hash):
        raise ImportValidationError(
            "content_sha256 must be a lowercase SHA-256 digest", field="content_sha256"
        )
    else:
        unhashed = dict(payload)
        unhashed.pop("content_sha256", None)
        canonical = json.dumps(
            unhashed,
            ensure_ascii=False,
            allow_nan=False,
            sort_keys=True,
            separators=(",", ":"),
        ).encode("utf-8")
        actual_hash = hashlib.sha256(canonical).hexdigest()
        if actual_hash != supplied_hash:
            raise ImportValidationError(
                "content_sha256 does not match the canonical JSON content",
                field="content_sha256",
            )
    return payload, tuple(warnings)


def _validate_calibration_reference(value: str | None) -> str:
    if value is None or not value.strip():
        raise ImportValidationError(
            "A calibration or method reference is required for CSV measurements",
            field="calibration_reference",
        )
    cleaned = value.strip()
    _validate_text(cleaned, field="calibration_reference", max_length=500)
    return cleaned


def _finite_float(value: str | None, *, field: str, row_number: int) -> float:
    if value is None or not value.strip():
        raise ImportValidationError(f"Missing numeric value on row {row_number}", field=field)
    if _has_formula_prefix(value):
        raise ImportValidationError(
            f"Spreadsheet formula prefixes are not allowed on row {row_number}",
            field=field,
        )
    try:
        number = float(value)
    except ValueError as error:
        raise ImportValidationError(f"Invalid number on row {row_number}", field=field) from error
    if not math.isfinite(number):
        raise ImportValidationError(f"Non-finite number on row {row_number}", field=field)
    return number


def _in_range(
    value: float,
    *,
    lower: float,
    upper: float,
    field: str,
    row_number: int,
    lower_inclusive: bool = True,
) -> None:
    below = value < lower if lower_inclusive else value <= lower
    if below or value > upper:
        qualifier = "at least" if lower_inclusive else "greater than"
        raise ImportValidationError(
            f"Value on row {row_number} must be {qualifier} {lower} and at most {upper}",
            field=field,
        )


def _parse_csv(
    filename: str, raw: bytes, calibration_reference: str | None
) -> tuple[list[dict[str, float]], str, tuple[str, ...]]:
    reference = _validate_calibration_reference(calibration_reference)
    try:
        text = raw.decode("utf-8-sig")
    except UnicodeDecodeError as error:
        raise ImportValidationError("CSV must be UTF-8", field="encoding") from error
    if "\x00" in text:
        raise ImportValidationError("NUL bytes are not allowed", field="csv")

    expected_headers = CSV_HEADERS[filename]
    try:
        reader = csv.DictReader(io.StringIO(text, newline=""), strict=True)
        if reader.fieldnames is None:
            raise ImportValidationError("CSV header is missing", field="headers")
        actual_headers = tuple(reader.fieldnames)
        if actual_headers != expected_headers:
            raise ImportValidationError(
                "Headers must exactly match: " + ",".join(expected_headers),
                field="headers",
            )

        rows: list[dict[str, float]] = []
        for row_number, source_row in enumerate(reader, start=2):
            if len(rows) >= MAX_IMPORT_ROWS:
                raise ImportValidationError(
                    f"CSV exceeds the {MAX_IMPORT_ROWS}-row limit", field="rows"
                )
            if None in source_row or any(value is None for value in source_row.values()):
                raise ImportValidationError(
                    f"Unexpected column count on row {row_number}", field="rows"
                )
            parsed_row: dict[str, float] = {
                field: _finite_float(source_row[field], field=field, row_number=row_number)
                for field in expected_headers
            }
            rows.append(parsed_row)
    except csv.Error as error:
        raise ImportValidationError(f"Malformed CSV: {error}", field="csv") from error

    if not rows:
        raise ImportValidationError("CSV must contain at least one data row", field="rows")

    if filename == "hydrogen_decay.csv":
        axis = "time_s"
        for index, parsed_row in enumerate(rows, start=2):
            _in_range(
                parsed_row[axis],
                lower=0,
                upper=31_536_000,
                field=axis,
                row_number=index,
            )
            _in_range(
                parsed_row["total_h2_mg_L"],
                lower=0,
                upper=2_000_000,
                field="total_h2_mg_L",
                row_number=index,
            )
            _in_range(
                parsed_row["uncertainty_mg_L"],
                lower=0,
                upper=2_000_000,
                field="uncertainty_mg_L",
                row_number=index,
            )
    elif filename == "bubble_distribution.csv":
        axis = "diameter_nm"
        for index, parsed_row in enumerate(rows, start=2):
            _in_range(
                parsed_row[axis],
                lower=0,
                upper=1_000_000,
                field=axis,
                row_number=index,
                lower_inclusive=False,
            )
            _in_range(
                parsed_row["number_per_mL"],
                lower=0,
                upper=1e16,
                field="number_per_mL",
                row_number=index,
            )
    else:
        axis = "crank_angle_deg"
        for index, parsed_row in enumerate(rows, start=2):
            _in_range(parsed_row[axis], lower=-720, upper=720, field=axis, row_number=index)
            _in_range(
                parsed_row["pressure_bar"],
                lower=0,
                upper=500,
                field="pressure_bar",
                row_number=index,
                lower_inclusive=False,
            )
            _in_range(
                parsed_row["uncertainty_bar"],
                lower=0,
                upper=500,
                field="uncertainty_bar",
                row_number=index,
            )

    previous: float | None = None
    for index, parsed_row in enumerate(rows, start=2):
        current = parsed_row[axis]
        if previous is not None and current <= previous:
            reason = "duplicate" if current == previous else "non-monotonic"
            raise ImportValidationError(
                f"{axis} contains a {reason} value on row {index}", field=axis
            )
        previous = current

    warnings: list[str] = []
    if rows[0][axis] != 0 and filename == "hydrogen_decay.csv":
        warnings.append("decay_series_does_not_start_at_zero")
    return rows, reference, tuple(warnings)


def parse_import(
    *,
    filename: str,
    content_type: str | None,
    raw_bytes: bytes,
    calibration_reference: str | None = None,
) -> ParsedImport:
    """Validate one complete import before any database or filesystem write."""

    canonical_name = validate_canonical_filename(filename)
    if not raw_bytes:
        raise ImportValidationError("Import file is empty", field="file")
    if len(raw_bytes) > MAX_IMPORT_BYTES:
        raise ImportValidationError(
            f"Import exceeds the {MAX_IMPORT_BYTES}-byte limit", field="file"
        )

    normalized_mime = (content_type or "application/octet-stream").split(";", 1)[0].strip()
    kind = "json" if canonical_name in JSON_FILENAMES else "csv"
    if normalized_mime not in ALLOWED_MIME_TYPES[kind]:
        raise ImportValidationError(
            f"Content type {normalized_mime!r} is not accepted for {kind}",
            field="content_type",
        )

    data: dict[str, Any] | list[dict[str, float]]
    if kind == "json":
        json_data, warnings = _parse_json(raw_bytes)
        data = json_data
        reference = None
    else:
        csv_data, reference, warnings = _parse_csv(canonical_name, raw_bytes, calibration_reference)
        data = csv_data

    return ParsedImport(
        canonical_name=canonical_name,
        kind=kind,
        mime_type=normalized_mime,
        sha256=hashlib.sha256(raw_bytes).hexdigest(),
        size_bytes=len(raw_bytes),
        raw_bytes=raw_bytes,
        data=data,
        calibration_reference=reference,
        warnings=warnings,
    )


def save_owned_attachment(root: Path, parsed: ParsedImport) -> str:
    """Save validated bytes under a generated name inside owned storage."""

    root.mkdir(parents=True, exist_ok=True)
    resolved_root = root.resolve()
    suffix = ".json" if parsed.kind == "json" else ".csv"
    storage_name = f"{uuid4().hex}{suffix}"
    destination = (resolved_root / storage_name).resolve()
    if destination.parent != resolved_root:
        raise RuntimeError("Generated attachment path escaped owned storage")
    try:
        with destination.open("xb") as file:
            file.write(parsed.raw_bytes)
    except Exception:
        destination.unlink(missing_ok=True)
        raise
    return storage_name


def remove_owned_attachment(root: Path, storage_name: str) -> bool:
    """Remove only a generated file that remains inside the configured root."""

    if not _STORAGE_NAME.fullmatch(storage_name):
        return False
    try:
        resolved_root = root.resolve()
        candidate = (resolved_root / storage_name).resolve()
        if candidate.parent != resolved_root or not candidate.is_file():
            return False
        candidate.unlink()
    except OSError:
        return False
    return True


__all__ = [
    "CSV_HEADERS",
    "JSON_FILENAMES",
    "MAX_IMPORT_BYTES",
    "MAX_IMPORT_ROWS",
    "ImportValidationError",
    "ParsedImport",
    "parse_import",
    "remove_owned_attachment",
    "save_owned_attachment",
    "validate_canonical_filename",
]

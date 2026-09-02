"""Versioned localhost API for HydroCycle's model and evidence store."""

from __future__ import annotations

import hashlib
import os
import platform
from collections.abc import AsyncIterator, Iterator
from contextlib import asynccontextmanager
from datetime import UTC
from pathlib import Path
from typing import Annotated, Any, cast
from uuid import uuid4

from fastapi import Depends, FastAPI, HTTPException, Query, Request, Response, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import ValidationError
from sqlalchemy import select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from starlette.datastructures import UploadFile

from .database import Database
from .exports import (
    ExportError,
    canonical_test_run_export,
    cfd_boundary_export,
    reviewed_csv_export,
    test_run_payload,
)
from .imports import (
    MAX_IMPORT_BYTES,
    ImportValidationError,
    ParsedImport,
    parse_import,
    remove_owned_attachment,
    save_owned_attachment,
)
from .metadata import get_model_metadata
from .orm import AttachmentRecord, EvidenceRecord, SimulationRecord, TestRunRecord, utc_now
from .physics import run_simulation
from .schemas import CfdBoundaryExport, ModelMetadata, SimulationInput, SimulationResult
from .test_run_contracts import (
    CalibrationReference,
    CanonicalSeriesName,
    ComparisonCollection,
    ComparisonRecord,
    EvidenceInput,
    TestRunCreate,
    TestRunDocument,
    TestRunImportResponse,
    TestRunMeasurements,
    TestRunPatch,
    TestRunProvenance,
    TestRunStatus,
    validate_review_state,
)

API_PREFIX = "/api/v1"
PROJECT_ROOT = Path(__file__).resolve().parents[4]
LOCAL_WEB_ORIGINS = ("http://127.0.0.1:5173", "http://localhost:5173")
SIMULATION_COMPARISON_METRICS = (
    "total_h2",
    "retained_h2",
    "retention_fraction",
    "peak_pressure",
    "modeled_total_h2",
)


def _default_database_url() -> str:
    explicit_url = os.environ.get("HYDROCYCLE_DATABASE_URL")
    if explicit_url:
        return explicit_url
    configured_path = Path(os.environ.get("HYDROCYCLE_DB_PATH", "data/hydrocycle.db"))
    if not configured_path.is_absolute():
        configured_path = PROJECT_ROOT / configured_path
    return f"sqlite+pysqlite:///{configured_path}"


def _get_session(request: Request) -> Iterator[Session]:
    database: Database = request.app.state.database
    session = database.SessionLocal()
    try:
        yield session
    finally:
        session.close()


SessionDependency = Annotated[Session, Depends(_get_session)]


def _metadata_dict() -> dict[str, Any]:
    return get_model_metadata().model_dump(mode="json", exclude_none=False)


def _get_test_run_or_404(session: Session, test_run_id: str) -> TestRunRecord:
    record = session.get(TestRunRecord, test_run_id)
    if record is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Test run not found")
    return record


def _add_evidence(
    session: Session,
    evidence: list[EvidenceInput],
    *,
    test_run_id: str | None = None,
    simulation_id: str | None = None,
) -> None:
    for item in evidence:
        if item.local_attachment is not None:
            attachment = session.get(AttachmentRecord, item.local_attachment)
            if test_run_id is None or attachment is None or attachment.test_run_id != test_run_id:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                    detail=("local_attachment must identify an attachment owned by this test run"),
                )
        payload = item.model_dump(mode="json", exclude_none=False)
        kind = payload.pop("kind")
        session.add(
            EvidenceRecord(
                id=str(uuid4()),
                test_run_id=test_run_id,
                simulation_id=simulation_id,
                kind=kind,
                payload_json=payload,
            )
        )


def _new_test_run(payload: TestRunCreate) -> TestRunRecord:
    provenance = payload.provenance.model_dump(mode="json", exclude_none=False)
    provenance["is_demo_synthetic"] = payload.is_demo_synthetic
    return TestRunRecord(
        id=str(uuid4()),
        name=payload.name,
        status=payload.status.value,
        operator=payload.operator,
        sample_id=payload.sample_id,
        provenance_json=provenance,
        measurements_json=payload.measurements.model_dump(
            mode="json", by_alias=True, exclude_none=False
        ),
        calibrations_json=[
            item.model_dump(mode="json", exclude_none=False)
            for item in payload.calibration_references
        ],
        comparisons_json=payload.comparisons.model_dump(mode="json", exclude_none=False),
        review_notes=payload.notes,
    )


def _simulation_comparisons(
    test_run: TestRunRecord,
    result: SimulationResult,
) -> list[ComparisonRecord]:
    """Build every compatible comparison without inventing measurements."""

    measurements = TestRunMeasurements.model_validate(test_run.measurements_json)
    records: list[ComparisonRecord] = []
    reproducibility_note = (
        f"Reproducibility: model {result.reproducibility.model_version}, seed "
        f"{result.reproducibility.random_seed}, result {result.result_id}."
    )

    def add(
        metric: str,
        *,
        label: str,
        measured_value: float | None,
        modeled_value: float | None,
        unit: str | None,
        note: str,
    ) -> None:
        records.append(
            ComparisonRecord(
                id=f"simulation:{result.result_id}:{metric}",
                kind="simulation",
                label=label,
                simulation_id=result.result_id,
                measured_value=measured_value,
                modeled_value=modeled_value,
                unit=unit,
                notes=f"{note} {reproducibility_note}",
            )
        )

    if measurements.total_h2_mg_l is not None:
        add(
            "total_h2",
            label="Total H2 loading: measured vs modeled",
            measured_value=measurements.total_h2_mg_l.value,
            modeled_value=result.loading.total_h2_mg_l.value,
            unit="mg/L",
            note="Measured total H2 is compared with the model loading output.",
        )
    elif measurements.headspace_gc_mg_l is not None:
        add(
            "total_h2",
            label="Headspace-GC total H2: measured vs modeled",
            measured_value=measurements.headspace_gc_mg_l.value,
            modeled_value=result.loading.total_h2_mg_l.value,
            unit="mg/L",
            note="Headspace-GC total H2 is compared with the model loading output.",
        )

    if measurements.retained_h2_mg_l is not None:
        add(
            "retained_h2",
            label="Retained H2 at intake: measured vs modeled",
            measured_value=measurements.retained_h2_mg_l.value,
            modeled_value=result.retention.retained_at_intake_mg_l.value,
            unit="mg/L",
            note="Measured retained H2 is compared with modeled intake retention.",
        )

    if measurements.retention_fraction is not None:
        add(
            "retention_fraction",
            label="Retention fraction: measured vs modeled",
            measured_value=measurements.retention_fraction.value,
            modeled_value=result.retention.retained_fraction.value,
            unit="1",
            note="Measured retention fraction is compared with modeled retention.",
        )

    if measurements.pressure_trace_csv:
        trace = result.proposed_cycle or result.motored_baseline
        trace_kind = "proposed reactive" if result.proposed_cycle is not None else "motored"
        add(
            "peak_pressure",
            label="Peak cylinder pressure: measured vs bounded 0D model",
            measured_value=max(point.pressure_bar for point in measurements.pressure_trace_csv),
            modeled_value=max(trace.pressure_pa) / 100_000.0,
            unit="bar",
            note=(
                f"Measured peak pressure is compared with the {trace_kind} single-zone "
                "trace; the modeled trace is schematic and not hardware-predictive."
            ),
        )

    if not records:
        modeled_value = result.loading.total_h2_mg_l.value
        add(
            "modeled_total_h2",
            label="Modeled total H2 loading",
            measured_value=None,
            modeled_value=modeled_value,
            unit="mg/L" if modeled_value is not None else None,
            note="No compatible canonical measurement was available for a paired value.",
        )

    return records


def _upsert_simulation_comparison(
    test_run: TestRunRecord,
    result: SimulationResult,
) -> bool:
    collection = ComparisonCollection.model_validate(test_run.comparisons_json)
    comparisons = _simulation_comparisons(test_run, result)
    generated_prefix = f"simulation:{result.result_id}"
    generated_ids = {
        generated_prefix,
        *(f"{generated_prefix}:{metric}" for metric in SIMULATION_COMPARISON_METRICS),
    }
    updated_items = [item for item in collection.items if item.id not in generated_ids]
    updated_items.extend(comparisons)

    updated = ComparisonCollection(items=updated_items).model_dump(mode="json", exclude_none=False)
    if updated == test_run.comparisons_json:
        return False
    test_run.comparisons_json = updated
    return True


def _persist_simulation(
    session: Session,
    result: SimulationResult,
    *,
    test_run_id: str | None,
) -> None:
    result_document = result.model_dump(mode="json", exclude_none=False)
    record = SimulationRecord(
        id=result.result_id,
        input_json=result.input.model_dump(mode="json", exclude_none=False),
        result_json=result_document,
        diagnostics_json=result_document["diagnostics"],
        reproducibility_json=result_document["reproducibility"],
    )
    existing = session.get(SimulationRecord, record.id)
    if existing is not None:
        if existing.result_json != record.result_json:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="A different simulation already uses this result id",
            )
        if test_run_id is not None:
            test_run = _get_test_run_or_404(session, test_run_id)
            changed = _upsert_simulation_comparison(test_run, result)
            if all(item.id != test_run_id for item in existing.test_runs):
                existing.test_runs.append(test_run)
                changed = True
            if changed:
                test_run.updated_at = utc_now()
                session.flush()
        return
    session.add(record)
    if test_run_id is not None:
        test_run = _get_test_run_or_404(session, test_run_id)
        record.test_runs.append(test_run)
        _upsert_simulation_comparison(test_run, result)
        test_run.updated_at = utc_now()
    for evidence in result_document.get("evidence", []):
        if not isinstance(evidence, dict):
            continue
        basis = evidence.get("basis")
        if basis not in {"measured", "literature", "user_assumption"}:
            continue
        session.add(
            EvidenceRecord(
                id=str(uuid4()),
                simulation_id=record.id,
                kind=basis,
                payload_json=evidence,
            )
        )


async def _read_import_request(
    request: Request,
    *,
    filename: str | None,
    calibration_reference: str | None,
) -> tuple[tuple[str, str | None, bytes, str | None], str | None]:
    request_content_type = request.headers.get("content-type", "")
    if request_content_type.casefold().startswith("multipart/form-data"):
        content_length = request.headers.get("content-length")
        if content_length is None:
            raise ImportValidationError("Multipart imports require Content-Length", field="file")
        try:
            # Permit bounded multipart framing in addition to the file itself.
            if int(content_length) > MAX_IMPORT_BYTES + 262_144:
                raise ImportValidationError(
                    f"Import exceeds the {MAX_IMPORT_BYTES}-byte file limit",
                    field="file",
                )
        except ValueError as error:
            raise ImportValidationError("Invalid Content-Length header", field="file") from error
        form = await request.form(
            max_files=1,
            max_fields=3,
            max_part_size=MAX_IMPORT_BYTES + 1,
        )
        candidate = form.get("file")
        if not isinstance(candidate, UploadFile):
            raise ImportValidationError("Multipart import requires a file part", field="file")
        upload_name = candidate.filename
        if not upload_name:
            raise ImportValidationError("Uploaded file has no filename", field="filename")
        raw = await candidate.read(MAX_IMPORT_BYTES + 1)
        form_reference = form.get("calibration_reference")
        if form_reference is not None and not isinstance(form_reference, str):
            raise ImportValidationError(
                "calibration_reference must be text", field="calibration_reference"
            )
        form_run_id = form.get("test_run_id")
        if form_run_id is not None and not isinstance(form_run_id, str):
            raise ImportValidationError("test_run_id must be text", field="test_run_id")
        return (
            upload_name,
            candidate.content_type,
            raw,
            form_reference or calibration_reference,
        ), form_run_id

    content_length = request.headers.get("content-length")
    if content_length is not None:
        try:
            if int(content_length) > MAX_IMPORT_BYTES:
                raise ImportValidationError(
                    f"Import exceeds the {MAX_IMPORT_BYTES}-byte limit", field="file"
                )
        except ValueError as error:
            raise ImportValidationError("Invalid Content-Length header", field="file") from error
    bounded_body = bytearray()
    async for chunk in request.stream():
        if len(bounded_body) + len(chunk) > MAX_IMPORT_BYTES:
            raise ImportValidationError(
                f"Import exceeds the {MAX_IMPORT_BYTES}-byte limit", field="file"
            )
        bounded_body.extend(chunk)
    raw = bytes(bounded_body)
    supplied_filename = filename or request.headers.get("x-filename")
    if supplied_filename is None:
        raise ImportValidationError(
            "Supply a filename query parameter or X-Filename header", field="filename"
        )
    return (
        supplied_filename,
        request_content_type,
        raw,
        calibration_reference,
    ), None


def _verify_imported_simulation(
    document: dict[str, Any], index: int
) -> tuple[str | None, SimulationResult]:
    field = f"simulations[{index}]"
    allowed_keys = {
        "id",
        "input",
        "result",
        "diagnostics",
        "reproducibility",
        "created_at",
    }
    unexpected = sorted(set(document) - allowed_keys)
    if unexpected:
        raise ImportValidationError(
            f"Unexpected saved-simulation fields: {', '.join(unexpected)}", field=field
        )
    result_payload = document.get("result", document)
    try:
        source_result = SimulationResult.model_validate(result_payload)
        source_input = SimulationInput.model_validate(document.get("input", source_result.input))
    except ValidationError as error:
        raise ImportValidationError(f"Invalid saved simulation: {error}", field=field) from error
    if source_input != source_result.input:
        raise ImportValidationError(
            "Saved simulation wrapper input does not match result.input", field=f"{field}.input"
        )
    try:
        regenerated = run_simulation(source_input)
    except ValueError as error:
        raise ImportValidationError(
            f"Saved simulation input cannot be reproduced: {error}", field=f"{field}.input"
        ) from error

    regenerated_payload = regenerated.model_dump(mode="json", exclude_none=False)
    supplied_payload = source_result.model_dump(mode="json", exclude_none=False)
    if supplied_payload != regenerated_payload:
        raise ImportValidationError(
            "Embedded simulation result does not exactly match deterministic regeneration",
            field=f"{field}.result",
        )

    source_id = document.get("id", source_result.result_id)
    if not isinstance(source_id, str) or source_id != regenerated.result_id:
        raise ImportValidationError(
            "Saved simulation id does not match the regenerated result id",
            field=f"{field}.id",
        )
    if "diagnostics" in document and document["diagnostics"] != regenerated_payload["diagnostics"]:
        raise ImportValidationError(
            "Saved diagnostics do not match deterministic regeneration",
            field=f"{field}.diagnostics",
        )
    if (
        "reproducibility" in document
        and document["reproducibility"] != regenerated_payload["reproducibility"]
    ):
        raise ImportValidationError(
            "Saved reproducibility metadata does not match deterministic regeneration",
            field=f"{field}.reproducibility",
        )
    return source_id, regenerated


def _restore_attachment_provenance(
    session: Session,
    record: TestRunRecord,
    source_run: TestRunDocument,
) -> dict[str, str]:
    imported_at = utc_now().isoformat()
    remapped_ids: dict[str, str] = {}
    for source in source_run.attachments:
        provenance_id = uuid4()
        remapped_ids[source.id] = str(provenance_id)
        metadata = dict(source.metadata)
        metadata["_hydrocycle_import_provenance"] = {
            "provenance_only": True,
            "source_attachment_id": source.id,
            "source_locally_owned": source.locally_owned,
            "source_created_at": source.created_at.isoformat(),
            "imported_at": imported_at,
        }
        session.add(
            AttachmentRecord(
                id=str(provenance_id),
                test_run_id=record.id,
                canonical_name=source.canonical_name,
                storage_name=f"provenance-{provenance_id.hex}",
                mime_type=source.mime_type,
                size_bytes=source.size_bytes,
                sha256=source.sha256,
                locally_owned=False,
                metadata_json=metadata,
                import_warnings_json=list(source.import_warnings),
                created_at=source.created_at,
            )
        )
    session.flush()
    return remapped_ids


def _import_json_run(
    session: Session, parsed: ParsedImport
) -> tuple[TestRunRecord, list[dict[str, Any]]]:
    if not isinstance(parsed.data, dict):
        raise ImportValidationError("Canonical JSON must contain an object", field="json")
    run_document = parsed.data.get("test_run")
    if not isinstance(run_document, dict):
        raise ImportValidationError("test_run must be an object", field="test_run")
    try:
        source_run = TestRunDocument.model_validate(run_document)
    except ValidationError as error:
        raise ImportValidationError(
            f"Invalid canonical test run: {error}", field="test_run"
        ) from error

    restored_status = source_run.status
    if "canonical_json_has_no_content_hash" in parsed.warnings:
        restored_status = TestRunStatus.NEEDS_REVIEW
    try:
        validate_review_state(
            restored_status,
            source_run.measurements,
            source_run.calibration_references,
        )
    except ValueError as error:
        raise ImportValidationError(str(error), field="test_run.status") from error

    provenance = source_run.provenance.model_copy(deep=True)
    provenance.import_sha256 = parsed.sha256
    provenance.source_test_run_id = source_run.id
    provenance.is_demo_synthetic = source_run.is_demo_synthetic
    record = TestRunRecord(
        id=str(uuid4()),
        name=source_run.name,
        status=restored_status.value,
        operator=source_run.operator,
        sample_id=source_run.sample_id,
        provenance_json=provenance.model_dump(mode="json", exclude_none=False),
        measurements_json=source_run.measurements.model_dump(
            mode="json", by_alias=True, exclude_none=False
        ),
        calibrations_json=[
            item.model_dump(mode="json", exclude_none=False)
            for item in source_run.calibration_references
        ],
        comparisons_json=source_run.comparisons.model_dump(mode="json", exclude_none=False),
        review_notes=source_run.notes,
    )
    session.add(record)
    session.flush()
    attachment_id_map = _restore_attachment_provenance(session, record, source_run)

    simulations = parsed.data.get("simulations", [])
    if not isinstance(simulations, list):
        raise ImportValidationError("simulations must be an array", field="simulations")
    imported_simulations: list[dict[str, Any]] = []
    for index, document in enumerate(simulations):
        if not isinstance(document, dict):
            raise ImportValidationError(
                "Each simulation must be an object", field=f"simulations[{index}]"
            )
        source_id, regenerated = _verify_imported_simulation(document, index)
        _persist_simulation(session, regenerated, test_run_id=record.id)
        imported_simulations.append({"source_id": source_id, "persisted_id": regenerated.result_id})

    evidence_items: list[EvidenceInput] = []
    for item in source_run.evidence:
        payload = item.model_dump(mode="json", exclude={"id", "created_at"})
        local_attachment = payload.get("local_attachment")
        if local_attachment is not None:
            remapped = attachment_id_map.get(str(local_attachment))
            if remapped is None:
                raise ImportValidationError(
                    "Evidence local_attachment does not identify an exported attachment",
                    field="test_run.evidence.local_attachment",
                )
            payload["local_attachment"] = remapped
        evidence_items.append(EvidenceInput.model_validate(payload))
    _add_evidence(session, evidence_items, test_run_id=record.id)
    return record, imported_simulations


def create_app(
    *,
    database_url: str | None = None,
    attachments_dir: str | Path | None = None,
) -> FastAPI:
    """Create an isolated local API instance, including test-friendly stores."""

    database = Database(database_url or _default_database_url())
    configured_attachments = attachments_dir or os.environ.get("HYDROCYCLE_ATTACHMENTS_DIR")
    if configured_attachments is None:
        attachment_root = PROJECT_ROOT / "data" / "attachments"
    else:
        attachment_root = Path(configured_attachments)
        if not attachment_root.is_absolute():
            attachment_root = PROJECT_ROOT / attachment_root

    @asynccontextmanager
    async def lifespan(_app: FastAPI) -> AsyncIterator[None]:
        database.initialize()
        attachment_root.mkdir(parents=True, exist_ok=True)
        try:
            yield
        finally:
            database.dispose()

    application = FastAPI(
        title="HydroCycle Model API",
        description=(
            "Local evidence-gated hydrogen-water engine analysis. Hydrogen is the fuel; "
            "water contributes no chemical energy."
        ),
        version="0.1.0",
        lifespan=lifespan,
        openapi_url=None,
        docs_url=None,
        redoc_url=None,
    )
    application.state.database = database
    application.state.attachments_dir = attachment_root
    application.add_middleware(
        CORSMiddleware,
        allow_origins=list(LOCAL_WEB_ORIGINS),
        allow_credentials=False,
        allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
        allow_headers=["Accept", "Content-Type", "X-Filename"],
    )

    @application.exception_handler(RequestValidationError)
    async def request_validation_error(
        _request: Request, error: RequestValidationError
    ) -> JSONResponse:
        # Do not echo malformed values: non-finite JSON numbers cannot be
        # serialized safely and imported evidence should not be reflected.
        detail = [
            {
                "type": item.get("type", "value_error"),
                "loc": list(item.get("loc", ())),
                "msg": item.get("msg", "Request validation failed"),
            }
            for item in error.errors()
        ]
        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            content={"detail": detail},
        )

    @application.get(f"{API_PREFIX}/health", tags=["system"])
    def health() -> dict[str, Any]:
        metadata = _metadata_dict()
        return {
            "service": "hydrocycle-model",
            "status": "ok" if database.ping() else "degraded",
            "database": "ok" if database.ping() else "unavailable",
            "schema": database.schema_status(),
            "python_version": platform.python_version(),
            "cantera_version": metadata.get("cantera_version"),
            "mechanism": metadata.get("mechanism"),
            "mechanism_sha256": metadata.get("mechanism_sha256"),
            "model_version": metadata.get("model_version"),
        }

    @application.get(
        f"{API_PREFIX}/model-metadata",
        response_model=ModelMetadata,
        tags=["model"],
    )
    def model_metadata() -> ModelMetadata:
        return get_model_metadata()

    @application.post(
        f"{API_PREFIX}/simulations",
        response_model=SimulationResult,
        tags=["model"],
    )
    def evaluate(
        payload: SimulationInput,
        session: SessionDependency,
        persist: Annotated[bool, Query()] = False,
        test_run_id: Annotated[str | None, Query(max_length=36)] = None,
    ) -> SimulationResult:
        if test_run_id is not None:
            _get_test_run_or_404(session, test_run_id)
            persist = True
        try:
            result = run_simulation(payload)
        except ValueError as error:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                detail=str(error),
            ) from error
        if persist:
            _persist_simulation(session, result, test_run_id=test_run_id)
            try:
                session.commit()
            except IntegrityError as error:
                session.rollback()
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="Simulation persistence conflict",
                ) from error
        return result

    @application.get(
        f"{API_PREFIX}/simulations/{{simulation_id}}",
        response_model=SimulationResult,
        tags=["model"],
    )
    def get_simulation(simulation_id: str, session: SessionDependency) -> SimulationResult:
        record = session.get(SimulationRecord, simulation_id)
        if record is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Simulation not found"
            )
        return SimulationResult.model_validate(record.result_json)

    @application.get(
        f"{API_PREFIX}/test-runs",
        response_model=list[TestRunDocument],
        tags=["test-runs"],
    )
    def list_test_runs(session: SessionDependency) -> list[dict[str, Any]]:
        records = session.scalars(
            select(TestRunRecord).order_by(TestRunRecord.updated_at.desc())
        ).all()
        return [test_run_payload(record) for record in records]

    @application.post(
        f"{API_PREFIX}/test-runs",
        response_model=TestRunDocument,
        status_code=status.HTTP_201_CREATED,
        tags=["test-runs"],
    )
    def create_test_run(payload: TestRunCreate, session: SessionDependency) -> dict[str, Any]:
        record = _new_test_run(payload)
        session.add(record)
        _add_evidence(session, payload.evidence, test_run_id=record.id)
        session.commit()
        session.refresh(record)
        return test_run_payload(record)

    @application.get(
        f"{API_PREFIX}/test-runs/{{test_run_id}}",
        response_model=TestRunDocument,
        tags=["test-runs"],
    )
    def get_test_run(test_run_id: str, session: SessionDependency) -> dict[str, Any]:
        return test_run_payload(_get_test_run_or_404(session, test_run_id))

    @application.patch(
        f"{API_PREFIX}/test-runs/{{test_run_id}}",
        response_model=TestRunDocument,
        tags=["test-runs"],
    )
    def update_test_run(
        test_run_id: str, payload: TestRunPatch, session: SessionDependency
    ) -> dict[str, Any]:
        record = _get_test_run_or_404(session, test_run_id)
        supplied = payload.model_fields_set
        replacement_fields = {
            "measurements",
            "calibration_references",
            "comparisons",
            "evidence",
            "provenance",
            "is_demo_synthetic",
        }
        if replacement_fields & supplied and payload.expected_updated_at is None:
            raise HTTPException(
                status_code=status.HTTP_428_PRECONDITION_REQUIRED,
                detail="Evidence-ledger replacement requires expected_updated_at",
            )
        if payload.expected_updated_at is not None:
            record_updated_at = record.updated_at
            if record_updated_at.tzinfo is None:
                record_updated_at = record_updated_at.replace(tzinfo=UTC)
            if record_updated_at != payload.expected_updated_at.astimezone(UTC):
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="Test Run changed since it was loaded; refresh and retry the edit",
                )
            claimed_at = utc_now()
            claim = session.execute(
                update(TestRunRecord)
                .where(
                    TestRunRecord.id == test_run_id,
                    TestRunRecord.updated_at == record.updated_at,
                )
                .values(updated_at=claimed_at)
                .returning(TestRunRecord.id),
                execution_options={"synchronize_session": False},
            )
            if claim.scalar_one_or_none() is None:
                session.rollback()
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="Test Run changed since it was loaded; refresh and retry the edit",
                )
            record.updated_at = claimed_at
        required_fields = {
            "name",
            "status",
            "provenance",
            "measurements",
            "calibration_references",
            "comparisons",
            "evidence",
        }
        for field in required_fields & supplied:
            if getattr(payload, field) is None:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                    detail=f"{field} cannot be null",
                )

        candidate_status = payload.status if "status" in supplied else TestRunStatus(record.status)
        candidate_measurements = (
            payload.measurements
            if "measurements" in supplied
            else TestRunMeasurements.model_validate(record.measurements_json)
        )
        candidate_calibrations = (
            payload.calibration_references
            if "calibration_references" in supplied
            else [CalibrationReference.model_validate(item) for item in record.calibrations_json]
        )
        assert candidate_status is not None
        assert candidate_measurements is not None
        assert candidate_calibrations is not None
        try:
            validate_review_state(
                candidate_status,
                candidate_measurements,
                candidate_calibrations,
            )
        except ValueError as error:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                detail=str(error),
            ) from error

        simple_fields = {
            "name": "name",
            "operator": "operator",
            "sample_id": "sample_id",
            "notes": "review_notes",
        }
        for source, destination in simple_fields.items():
            if source in supplied:
                value = getattr(payload, source)
                setattr(record, destination, value)
        if "status" in supplied:
            record.status = candidate_status.value
        if "measurements" in supplied:
            record.measurements_json = candidate_measurements.model_dump(
                mode="json", by_alias=True, exclude_none=False
            )
        if "calibration_references" in supplied:
            record.calibrations_json = [
                item.model_dump(mode="json", exclude_none=False) for item in candidate_calibrations
            ]
        if "comparisons" in supplied:
            assert payload.comparisons is not None
            record.comparisons_json = payload.comparisons.model_dump(
                mode="json", exclude_none=False
            )
        if "provenance" in supplied:
            assert payload.provenance is not None
            record.provenance_json = payload.provenance.model_dump(mode="json", exclude_none=False)
        if "is_demo_synthetic" in supplied:
            provenance = dict(record.provenance_json)
            provenance["is_demo_synthetic"] = bool(payload.is_demo_synthetic)
            record.provenance_json = provenance
        if "evidence" in supplied:
            for item in list(record.evidence_records):
                session.delete(item)
            _add_evidence(session, payload.evidence or [], test_run_id=record.id)
        record.updated_at = utc_now()
        session.commit()
        session.refresh(record)
        return test_run_payload(record)

    @application.delete(f"{API_PREFIX}/test-runs/{{test_run_id}}", tags=["test-runs"])
    def delete_test_run(
        test_run_id: str,
        session: SessionDependency,
        confirm: Annotated[bool, Query(description="Explicit UI/user confirmation")] = False,
    ) -> dict[str, Any]:
        if not confirm:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Deletion requires confirm=true",
            )
        record = _get_test_run_or_404(session, test_run_id)
        owned_names = [item.storage_name for item in record.attachments if item.locally_owned]
        session.delete(record)
        session.commit()
        removed = 0
        failed: list[str] = []
        for storage_name in owned_names:
            if remove_owned_attachment(attachment_root, storage_name):
                removed += 1
            else:
                failed.append(storage_name)
        return {
            "deleted": True,
            "test_run_id": test_run_id,
            "owned_attachments_removed": removed,
            "owned_attachment_cleanup_failures": len(failed),
        }

    @application.post(
        f"{API_PREFIX}/test-runs/import",
        response_model=TestRunImportResponse,
        status_code=status.HTTP_201_CREATED,
        tags=["test-runs"],
    )
    async def import_test_run(
        request: Request,
        session: SessionDependency,
        filename: Annotated[str | None, Query(max_length=128)] = None,
        test_run_id: Annotated[str | None, Query(max_length=36)] = None,
        calibration_reference: Annotated[str | None, Query(max_length=500)] = None,
    ) -> dict[str, Any]:
        try:
            request_parts, multipart_run_id = await _read_import_request(
                request,
                filename=filename,
                calibration_reference=calibration_reference,
            )
            if multipart_run_id:
                if test_run_id is not None and test_run_id != multipart_run_id:
                    raise ImportValidationError(
                        "Conflicting test_run_id values", field="test_run_id"
                    )
                test_run_id = multipart_run_id
            parsed = parse_import(
                filename=request_parts[0],
                content_type=request_parts[1],
                raw_bytes=request_parts[2],
                calibration_reference=request_parts[3],
            )
        except ImportValidationError as error:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                detail=error.as_detail(),
            ) from error

        storage_name: str | None = None
        imported_simulations: list[dict[str, Any]] = []
        try:
            if parsed.kind == "json":
                if test_run_id is not None:
                    raise ImportValidationError(
                        "Canonical JSON creates a new test run; omit test_run_id",
                        field="test_run_id",
                    )
                record, imported_simulations = _import_json_run(session, parsed)
            else:
                if test_run_id is None:
                    empty_measurements = TestRunMeasurements()
                    empty_provenance = TestRunProvenance(
                        import_sha256=parsed.sha256,
                        is_demo_synthetic=False,
                    )
                    record = TestRunRecord(
                        id=str(uuid4()),
                        name=f"Imported {parsed.canonical_name}",
                        status="needs_review",
                        provenance_json=empty_provenance.model_dump(
                            mode="json", exclude_none=False
                        ),
                        measurements_json=empty_measurements.model_dump(
                            mode="json", by_alias=True, exclude_none=False
                        ),
                        calibrations_json=[],
                        comparisons_json=ComparisonCollection().model_dump(mode="json"),
                    )
                    session.add(record)
                    session.flush()
                else:
                    record = _get_test_run_or_404(session, test_run_id)
                measurements_payload = TestRunMeasurements.model_validate(
                    record.measurements_json
                ).model_dump(mode="json", by_alias=True, exclude_none=False)
                measurements_payload[parsed.canonical_name] = parsed.data
                measurements = TestRunMeasurements.model_validate(measurements_payload)
                record.measurements_json = measurements.model_dump(
                    mode="json", by_alias=True, exclude_none=False
                )
                calibrations = [
                    CalibrationReference.model_validate(item) for item in record.calibrations_json
                ]
                calibrations.append(
                    CalibrationReference(
                        id=str(uuid4()),
                        instrument="imported measurement method",
                        method=str(parsed.calibration_reference),
                        applies_to=[cast(CanonicalSeriesName, parsed.canonical_name)],
                        calibrated_at=None,
                        expires_at=None,
                        notes=f"Applies to {parsed.canonical_name}",
                    )
                )
                record.calibrations_json = [
                    item.model_dump(mode="json", exclude_none=False) for item in calibrations
                ]
                record.status = "needs_review"
                record.updated_at = utc_now()

            storage_name = save_owned_attachment(attachment_root, parsed)
            attachment = AttachmentRecord(
                id=str(uuid4()),
                test_run_id=record.id,
                canonical_name=parsed.canonical_name,
                storage_name=storage_name,
                mime_type=parsed.mime_type,
                size_bytes=parsed.size_bytes,
                sha256=parsed.sha256,
                locally_owned=True,
                metadata_json={
                    "kind": parsed.kind,
                    "calibration_reference": parsed.calibration_reference,
                    "row_count": len(parsed.data) if isinstance(parsed.data, list) else None,
                },
                import_warnings_json=list(parsed.warnings),
            )
            session.add(attachment)
            session.commit()
            session.refresh(record)
        except HTTPException:
            session.rollback()
            if storage_name is not None:
                remove_owned_attachment(attachment_root, storage_name)
            raise
        except ImportValidationError as error:
            session.rollback()
            if storage_name is not None:
                remove_owned_attachment(attachment_root, storage_name)
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                detail=error.as_detail(),
            ) from error
        except Exception:
            session.rollback()
            if storage_name is not None:
                remove_owned_attachment(attachment_root, storage_name)
            raise

        return {
            "test_run": test_run_payload(record),
            "attachment": {
                "id": attachment.id,
                "canonical_name": attachment.canonical_name,
                "sha256": attachment.sha256,
                "size_bytes": attachment.size_bytes,
                "import_warnings": attachment.import_warnings_json,
            },
            "imported_simulations": imported_simulations,
        }

    @application.get(
        f"{API_PREFIX}/test-runs/{{test_run_id}}/export",
        tags=["test-runs"],
        responses={
            200: {
                "model": CfdBoundaryExport,
                "description": (
                    "Canonical JSON, reviewed CSV ZIP, or neutral homogeneous 0D boundary "
                    "export. The named JSON schema applies to format=cfd_boundary."
                ),
                "content": {"application/zip": {"schema": {"type": "string", "format": "binary"}}},
            }
        },
    )
    def export_test_run(
        test_run_id: str,
        session: SessionDependency,
        export_format: Annotated[
            str, Query(alias="format", pattern=r"^[a-z_]+$")
        ] = "canonical_json",
        simulation_id: Annotated[str | None, Query(max_length=64)] = None,
    ) -> Response:
        record = _get_test_run_or_404(session, test_run_id)
        try:
            if export_format in {"canonical_json", "json"}:
                content, media_type, download_name = canonical_test_run_export(session, record)
            elif export_format in {"reviewed_csv", "csv"}:
                content, media_type, download_name = reviewed_csv_export(record)
            elif export_format in {"cfd", "cfd_boundary"}:
                content, media_type, download_name = cfd_boundary_export(
                    session,
                    record,
                    model_metadata=_metadata_dict(),
                    simulation_id=simulation_id,
                )
            else:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                    detail="format must be canonical_json, reviewed_csv, or cfd_boundary",
                )
        except ExportError as error:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(error)) from error
        return Response(
            content=content,
            media_type=media_type,
            headers={
                "Content-Disposition": f'attachment; filename="{download_name}"',
                "X-Content-SHA256": hashlib.sha256(content).hexdigest(),
            },
        )

    return application


app = create_app()


__all__ = ["API_PREFIX", "app", "create_app"]

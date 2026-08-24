from __future__ import annotations

import inspect
import json

from fastapi.testclient import TestClient

from hydrocycle.api import app
from hydrocycle.telemetry import TelemetrySource


def test_versioned_api_surface_is_complete_and_read_only() -> None:
    operations = {
        (method, route.path)
        for route in app.routes
        for method in getattr(route, "methods", set())
        if method not in {"HEAD", "OPTIONS"}
    }
    assert ("GET", "/api/v1/health") in operations
    assert ("GET", "/api/v1/model-metadata") in operations
    assert ("POST", "/api/v1/simulations") in operations
    assert any(
        method == "GET" and path.startswith("/api/v1/simulations/{") for method, path in operations
    )
    assert ("GET", "/api/v1/test-runs") in operations
    assert ("POST", "/api/v1/test-runs") in operations
    assert ("POST", "/api/v1/test-runs/import") in operations
    assert any(
        method == "PATCH" and path.startswith("/api/v1/test-runs/{") for method, path in operations
    )
    assert any(
        method == "DELETE" and path.startswith("/api/v1/test-runs/{") for method, path in operations
    )
    assert any(method == "GET" and path.endswith("/export") for method, path in operations)

    forbidden = {"actuator", "ignition", "injector", "throttle", "command", "controlsink"}
    exposed_paths = " ".join(path.casefold() for _, path in operations)
    assert not any(word in exposed_paths for word in forbidden)


def test_openapi_document_is_deterministic() -> None:
    first = json.dumps(app.openapi(), sort_keys=True, separators=(",", ":"))
    second = json.dumps(app.openapi(), sort_keys=True, separators=(",", ":"))
    assert first == second
    assert '"openapi"' in first
    assert '"SimulationInput"' in first
    assert '"SimulationResult"' in first


def test_only_read_snapshot_is_defined_on_future_hardware_protocol() -> None:
    public_callables = {
        name
        for name, member in inspect.getmembers(TelemetrySource)
        if not name.startswith("_") and callable(member)
    }
    assert public_callables == {"read_snapshot"}


def test_cors_is_limited_to_the_local_web_client() -> None:
    client = TestClient(app)
    allowed = client.options(
        "/api/v1/health",
        headers={
            "Origin": "http://127.0.0.1:5173",
            "Access-Control-Request-Method": "GET",
        },
    )
    assert allowed.headers["access-control-allow-origin"] == "http://127.0.0.1:5173"

    denied = client.options(
        "/api/v1/health",
        headers={
            "Origin": "https://example.invalid",
            "Access-Control-Request-Method": "GET",
        },
    )
    assert "access-control-allow-origin" not in denied.headers

"""Read-only boundary for a possible future data-acquisition adapter.

V1 intentionally defines no writer, command sink, actuator, ignition,
injector, throttle, or control protocol.
"""

from __future__ import annotations

from collections.abc import Mapping
from typing import Protocol, runtime_checkable


@runtime_checkable
class TelemetrySource(Protocol):
    """A future DAQ may expose an immutable point-in-time measurement set."""

    def read_snapshot(self) -> Mapping[str, object]:
        """Read current telemetry without mutating hardware state."""
        ...


__all__ = ["TelemetrySource"]

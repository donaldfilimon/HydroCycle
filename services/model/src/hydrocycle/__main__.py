"""Run the local HydroCycle model service."""

from __future__ import annotations

import os

import uvicorn


def main() -> None:
    """Bind only to loopback; remote exposure is outside the V1 contract."""

    port = int(os.environ.get("HYDROCYCLE_PORT", "8000"))
    uvicorn.run(
        "hydrocycle.api:app",
        host="127.0.0.1",
        port=port,
        reload=False,
        access_log=True,
    )


if __name__ == "__main__":
    main()

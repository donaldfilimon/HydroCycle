"""Local-only SQLite configuration and session lifecycle."""

from __future__ import annotations

from collections.abc import Iterator
from contextlib import contextmanager
from pathlib import Path
from typing import Any

from sqlalchemy import Engine, create_engine, event, inspect, text
from sqlalchemy.engine import make_url
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from .orm import Base

EXPECTED_TABLES = frozenset(
    {
        "test_runs",
        "simulations",
        "test_run_simulations",
        "attachments",
        "evidence_records",
    }
)


class Database:
    """Own the SQLite engine used by one FastAPI application instance.

    HydroCycle intentionally rejects non-SQLite URLs.  This prevents a local
    configuration typo from silently sending experimental data to a networked
    database.
    """

    def __init__(self, database_url: str) -> None:
        parsed = make_url(database_url)
        if parsed.get_backend_name() != "sqlite":
            raise ValueError("HydroCycle persistence must use a local SQLite database")

        database_name = parsed.database
        is_memory = database_name in {None, "", ":memory:"}
        self.is_memory = is_memory
        if not is_memory and database_name is not None:
            database_path = Path(database_name).expanduser()
            database_path.parent.mkdir(parents=True, exist_ok=True)

        engine_options: dict[str, Any] = {
            "connect_args": {"check_same_thread": False},
            "future": True,
        }
        if is_memory:
            engine_options["poolclass"] = StaticPool

        self.url = database_url
        self.engine: Engine = create_engine(database_url, **engine_options)
        event.listen(self.engine, "connect", self._configure_sqlite_connection)
        self.SessionLocal = sessionmaker(
            bind=self.engine,
            autoflush=False,
            autocommit=False,
            expire_on_commit=False,
            class_=Session,
        )

    @staticmethod
    def _configure_sqlite_connection(dbapi_connection: Any, _connection_record: Any) -> None:
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.execute("PRAGMA busy_timeout=5000")
        cursor.close()

    def initialize(self) -> None:
        """Upgrade file databases with Alembic; initialize memory databases for tests."""

        migrations_ini = Path(__file__).resolve().parents[2] / "alembic.ini"
        if not self.is_memory and migrations_ini.is_file():
            from alembic import command
            from alembic.config import Config

            config = Config(str(migrations_ini))
            config.set_main_option("sqlalchemy.url", self.url)
            command.upgrade(config, "head")
            return
        Base.metadata.create_all(self.engine)

    def ping(self) -> bool:
        try:
            with self.engine.connect() as connection:
                connection.execute(text("SELECT 1"))
            return True
        except Exception:
            return False

    def schema_status(self) -> dict[str, Any]:
        inspector = inspect(self.engine)
        present = set(inspector.get_table_names())
        missing = sorted(EXPECTED_TABLES - present)
        revision: str | None = None
        if "alembic_version" in present:
            try:
                with self.engine.connect() as connection:
                    revision = connection.execute(
                        text("SELECT version_num FROM alembic_version LIMIT 1")
                    ).scalar_one_or_none()
            except Exception:
                revision = None
        return {
            "status": (
                "incomplete" if missing else "current" if revision is not None else "unversioned"
            ),
            "missing_tables": missing,
            "alembic_revision": revision,
        }

    @contextmanager
    def session(self) -> Iterator[Session]:
        session = self.SessionLocal()
        try:
            yield session
            session.commit()
        except Exception:
            session.rollback()
            raise
        finally:
            session.close()

    def dispose(self) -> None:
        self.engine.dispose()


__all__ = ["EXPECTED_TABLES", "Database"]

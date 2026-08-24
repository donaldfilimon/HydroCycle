from __future__ import annotations

from pathlib import Path

import sqlalchemy as sa
from alembic import command
from alembic.config import Config

MODEL_ROOT = Path(__file__).resolve().parents[1]


def alembic_config(database_url: str) -> Config:
    config = Config(MODEL_ROOT / "alembic.ini")
    config.set_main_option("script_location", str(MODEL_ROOT / "alembic"))
    config.set_main_option("sqlalchemy.url", database_url)
    return config


def test_blank_database_upgrades_to_head(tmp_path: Path) -> None:
    database_url = f"sqlite:///{tmp_path / 'blank.db'}"
    command.upgrade(alembic_config(database_url), "head")

    engine = sa.create_engine(database_url)
    inspector = sa.inspect(engine)
    assert {
        "alembic_version",
        "attachments",
        "evidence_records",
        "simulations",
        "test_run_simulations",
        "test_runs",
    }.issubset(set(inspector.get_table_names()))
    with engine.connect() as connection:
        revision = connection.scalar(sa.text("SELECT version_num FROM alembic_version"))
    assert revision == "0002_test_run_status_index"


def test_prior_revision_upgrades_without_losing_data(tmp_path: Path) -> None:
    database_url = f"sqlite:///{tmp_path / 'prior.db'}"
    config = alembic_config(database_url)
    command.upgrade(config, "0001_initial")

    engine = sa.create_engine(database_url)
    with engine.begin() as connection:
        connection.execute(
            sa.text(
                """
                INSERT INTO test_runs (
                    id, name, status, operator, sample_id, provenance_json,
                    measurements_json, calibrations_json, comparisons_json,
                    review_notes, created_at, updated_at
                ) VALUES (
                    :id, :name, :status, NULL, NULL, :provenance,
                    :measurements, :calibrations, :comparisons, NULL,
                    CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
                )
                """
            ),
            {
                "id": "00000000-0000-0000-0000-000000000001",
                "name": "migration sentinel",
                "status": "draft",
                "provenance": '{"source":"fixture"}',
                "measurements": "{}",
                "calibrations": "[]",
                "comparisons": "[]",
            },
        )

    command.upgrade(config, "head")

    inspector = sa.inspect(engine)
    indexes = {index["name"] for index in inspector.get_indexes("test_runs")}
    assert "ix_test_runs_status_updated_at" in indexes
    with engine.connect() as connection:
        row = connection.execute(
            sa.text("SELECT id, name, status, provenance_json FROM test_runs")
        ).one()
    assert tuple(row) == (
        "00000000-0000-0000-0000-000000000001",
        "migration sentinel",
        "draft",
        '{"source":"fixture"}',
    )

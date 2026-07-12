from collections.abc import Iterator
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from backend.app.core.config import Settings
from backend.app.infrastructure.migrations import upgrade_database
from backend.app.main import create_app


@pytest.fixture()
def client(tmp_path: Path) -> Iterator[TestClient]:
    settings = Settings(
        environment="test",
        storage_root=tmp_path / "storage",
        max_upload_bytes=64 * 1024 * 1024,
        duckdb_memory_limit="256MB",
        duckdb_threads=2,
    )
    upgrade_database(settings)
    with TestClient(create_app(settings)) as test_client:
        yield test_client

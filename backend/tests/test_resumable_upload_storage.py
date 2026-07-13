from __future__ import annotations

import asyncio
import hashlib
from pathlib import Path

from backend.app.infrastructure.resumable_storage import ResumableUploadStorage


def _stream(payload: bytes):
    async def iterator():
        yield payload

    return iterator()


def test_part_storage_uses_short_immutable_file_names(tmp_path: Path):
    payload = b"auditflow-resumable-part"
    storage = ResumableUploadStorage(tmp_path / "uploads")

    stored = asyncio.run(
        storage.store_part(
            session_id="a" * 32,
            part_number=1,
            content=_stream(payload),
            expected_size_bytes=len(payload),
            expected_sha256=hashlib.sha256(payload).hexdigest(),
        )
    )

    assert stored.path.is_file()
    assert stored.path.read_bytes() == payload
    assert stored.path.parent.name == "parts"
    assert stored.path.name.startswith("00000001-")
    assert stored.path.name.endswith(".part")
    assert len(stored.path.name) <= 40
    assert hashlib.sha256(stored.path.read_bytes()).hexdigest() == stored.sha256


def test_same_part_number_gets_distinct_storage_paths(tmp_path: Path):
    storage = ResumableUploadStorage(tmp_path / "uploads")
    first_payload = b"first"
    second_payload = b"second"

    first = asyncio.run(
        storage.store_part(
            session_id="b" * 32,
            part_number=1,
            content=_stream(first_payload),
            expected_size_bytes=len(first_payload),
            expected_sha256=hashlib.sha256(first_payload).hexdigest(),
        )
    )
    second = asyncio.run(
        storage.store_part(
            session_id="b" * 32,
            part_number=1,
            content=_stream(second_payload),
            expected_size_bytes=len(second_payload),
            expected_sha256=hashlib.sha256(second_payload).hexdigest(),
        )
    )

    assert first.path != second.path
    assert first.path.read_bytes() == first_payload
    assert second.path.read_bytes() == second_payload

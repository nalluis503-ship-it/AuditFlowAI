import hashlib
import json
from datetime import UTC, datetime

from backend.app.core.config import Settings
from backend.app.infrastructure.database import Database
from backend.app.infrastructure.source_repository import (
    SqlAlchemySourceRepository,
)
from backend.scripts.migrate_v090_storage import (
    migrate_legacy_storage,
)


def test_migrates_v090_storage_without_losing_source(tmp_path):
    storage_root = tmp_path / "storage"
    source_root = storage_root / "sources"
    profile_root = storage_root / "profiles"
    source_root.mkdir(parents=True)
    profile_root.mkdir(parents=True)

    source_id = "legacy-source"
    content = b"id,name\n1,Ana\n"
    digest = hashlib.sha256(content).hexdigest()
    (source_root / f"{source_id}.csv").write_bytes(content)

    payload = {
        "id": source_id,
        "original_name": "legacy.csv",
        "extension": "csv",
        "media_type": "text/csv",
        "size_bytes": len(content),
        "sha256": digest,
        "stored_at": datetime.now(UTC).isoformat(),
        "sheets": [
            {
                "name": "legacy",
                "header_row_number": 1,
                "row_count": 1,
                "column_count": 2,
                "duplicate_row_count": 0,
                "columns": [
                    {
                        "name": "id",
                        "position": 1,
                        "null_count": 0,
                        "non_null_count": 1,
                    },
                    {
                        "name": "name",
                        "position": 2,
                        "null_count": 0,
                        "non_null_count": 1,
                    },
                ],
            }
        ],
    }
    (profile_root / f"{source_id}.json").write_text(
        json.dumps(payload),
        encoding="utf-8",
    )

    settings = Settings(storage_root=storage_root)
    report = migrate_legacy_storage(settings)

    assert report.migrated == 1
    assert report.failed == 0
    assert (source_root / source_id / "original.csv").read_bytes() == content

    repository = SqlAlchemySourceRepository(Database(settings))
    record = repository.get(source_id)
    assert record is not None
    assert record.profile is not None
    assert record.profile.profile_version == "0.9-import"

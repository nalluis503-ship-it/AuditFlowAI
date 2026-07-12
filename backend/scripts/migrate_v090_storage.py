import argparse
import hashlib
import json
import shutil
from dataclasses import dataclass
from datetime import UTC, datetime
from pathlib import Path

from backend.app.core.config import Settings
from backend.app.domain.models import (
    ColumnProfile,
    ProfileCompleteness,
    SheetProfile,
    SourceProfile,
    SourceRecord,
    SourceStatus,
)
from backend.app.infrastructure.database import Database
from backend.app.infrastructure.migrations import head_revision, upgrade_database
from backend.app.infrastructure.source_repository import (
    SqlAlchemySourceRepository,
)
from backend.app.infrastructure.storage import FileSystemSourceStorage


@dataclass(frozen=True, slots=True)
class MigrationReport:
    migrated: int
    skipped: int
    failed: int


def _sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as source:
        while chunk := source.read(8 * 1024 * 1024):
            digest.update(chunk)
    return digest.hexdigest()


def _legacy_profile(payload: dict) -> SourceProfile:
    sheets: list[SheetProfile] = []

    for sheet in payload.get("sheets", []):
        row_count = int(sheet.get("row_count", 0))
        columns = [
            ColumnProfile(
                name=column["name"],
                position=int(column["position"]),
                data_type=column.get("data_type", "unknown"),
                null_count=int(column.get("null_count", 0)),
                non_null_count=int(column.get("non_null_count", 0)),
                null_percentage=(
                    round(
                        (int(column.get("null_count", 0)) / row_count) * 100,
                        4,
                    )
                    if row_count
                    else 0.0
                ),
                distinct_count=column.get("distinct_count"),
                sample_values=list(column.get("sample_values", [])),
            )
            for column in sheet.get("columns", [])
        ]
        null_cells = sum(column.null_count for column in columns)
        total_cells = row_count * len(columns)
        sheets.append(
            SheetProfile(
                name=sheet["name"],
                header_row_number=sheet.get("header_row_number"),
                header_confidence=sheet.get("header_confidence"),
                header_candidates=sheet.get("header_candidates", []),
                row_count=row_count,
                column_count=len(columns),
                duplicate_row_count=int(sheet.get("duplicate_row_count", 0)),
                total_cell_count=total_cells,
                null_cell_count=null_cells,
                null_percentage=(
                    round((null_cells / total_cells) * 100, 4) if total_cells else 0.0
                ),
                columns=columns,
            )
        )

    return SourceProfile(
        id=str(payload["id"]),
        original_name=str(payload["original_name"]),
        extension=str(payload["extension"]).lstrip("."),
        media_type=payload.get("media_type"),
        size_bytes=int(payload["size_bytes"]),
        sha256=str(payload["sha256"]),
        stored_at=payload["stored_at"],
        status=SourceStatus.READY,
        profile_version="0.9-import",
        profile_engine="legacy-python",
        completeness=ProfileCompleteness.EXACT,
        sheets=sheets,
    )


def _copy_verified(source: Path, destination: Path, expected_hash: str) -> None:
    destination.parent.mkdir(parents=True, exist_ok=True)
    if destination.is_file():
        if _sha256(destination) != expected_hash:
            raise ValueError(
                f"Existing destination has a different SHA-256: {destination}"
            )
        return

    temporary = destination.with_suffix(destination.suffix + ".part")
    temporary.unlink(missing_ok=True)
    try:
        shutil.copy2(source, temporary)
        if _sha256(temporary) != expected_hash:
            raise ValueError(f"Copied source failed SHA-256 verification: {source}")
        temporary.replace(destination)
    except Exception:
        temporary.unlink(missing_ok=True)
        raise


def _archive_legacy_profile(settings: Settings, profile_path: Path) -> None:
    archive_root = settings.storage_root / "migration" / "v090-profiles"
    archive_root.mkdir(parents=True, exist_ok=True)
    archived = archive_root / profile_path.name
    if not archived.exists():
        shutil.copy2(profile_path, archived)


def migrate_legacy_storage(settings: Settings) -> MigrationReport:
    settings.prepare_directories()
    upgrade_database(settings)
    database = Database(settings)
    database.require_schema(head_revision(settings))
    repository = SqlAlchemySourceRepository(database)
    storage = FileSystemSourceStorage(settings)

    migrated = 0
    skipped = 0
    failed = 0

    for profile_path in sorted(settings.profile_storage.glob("*.json")):
        try:
            payload = json.loads(profile_path.read_text(encoding="utf-8"))
            source_id = str(payload["id"])
            if repository.get(source_id) is not None:
                skipped += 1
                continue

            extension = "." + str(payload["extension"]).lstrip(".")
            legacy_source = settings.source_storage / f"{source_id}{extension}"
            destination = storage.source_path(source_id, extension)

            if not legacy_source.is_file():
                if destination.is_file():
                    legacy_source = destination
                else:
                    raise FileNotFoundError(f"Original source missing for {source_id}")

            expected_hash = str(payload["sha256"])
            actual_hash = _sha256(legacy_source)
            if actual_hash != expected_hash:
                raise ValueError(f"SHA-256 mismatch for {source_id}")

            _archive_legacy_profile(settings, profile_path)
            _copy_verified(legacy_source, destination, expected_hash)

            profile = _legacy_profile(payload)
            stored_at = profile.stored_at
            if stored_at.tzinfo is None:
                stored_at = stored_at.replace(tzinfo=UTC)

            storage.persist_profile(
                source_id,
                profile.model_dump_json(indent=2),
            )
            record = SourceRecord(
                id=source_id,
                original_name=profile.original_name,
                extension=profile.extension,
                media_type=profile.media_type,
                size_bytes=profile.size_bytes,
                sha256=profile.sha256,
                stored_path=str(destination),
                status=SourceStatus.READY,
                stored_at=stored_at,
                updated_at=datetime.now(UTC),
                profile=profile,
            )
            repository.create(record)
            migrated += 1
        except Exception as exc:
            failed += 1
            print(f"[FAILED] {profile_path.name}: {exc}")

    return MigrationReport(
        migrated=migrated,
        skipped=skipped,
        failed=failed,
    )


def main() -> int:
    parser = argparse.ArgumentParser(
        description=(
            "Import v0.9 source files and JSON profiles into "
            "the v0.10 persistent catalog."
        )
    )
    parser.add_argument(
        "--storage-root",
        type=Path,
        default=None,
        help="Override AUDITFLOW_STORAGE_ROOT.",
    )
    arguments = parser.parse_args()

    settings = Settings(storage_root=arguments.storage_root or Settings().storage_root)
    report = migrate_legacy_storage(settings)
    print(
        "Migration complete: "
        f"{report.migrated} migrated, "
        f"{report.skipped} skipped, "
        f"{report.failed} failed."
    )
    return 1 if report.failed else 0


if __name__ == "__main__":
    raise SystemExit(main())

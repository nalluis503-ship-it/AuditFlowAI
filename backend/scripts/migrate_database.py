import argparse
from pathlib import Path

from backend.app.core.config import Settings
from backend.app.infrastructure.migrations import upgrade_database


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Apply AuditFlowAI database migrations.",
    )
    parser.add_argument(
        "--storage-root",
        type=Path,
        default=None,
        help="Override AUDITFLOW_STORAGE_ROOT.",
    )
    arguments = parser.parse_args()

    defaults = Settings()
    settings = Settings(
        storage_root=arguments.storage_root or defaults.storage_root,
    )
    upgrade_database(settings)
    print(f"Database migrated to head: {settings.database_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

from alembic import command
from alembic.config import Config
from alembic.script import ScriptDirectory

from backend.app.core.config import BACKEND_ROOT, Settings


def alembic_config(settings: Settings) -> Config:
    config = Config(str(BACKEND_ROOT / "alembic.ini"))
    config.set_main_option(
        "script_location",
        str(BACKEND_ROOT / "migrations"),
    )
    config.attributes["database_url"] = settings.database_url
    return config


def head_revision(settings: Settings) -> str:
    revision = ScriptDirectory.from_config(alembic_config(settings)).get_current_head()
    if revision is None:
        raise RuntimeError("No Alembic head revision is configured.")
    return revision


def upgrade_database(settings: Settings, revision: str = "head") -> None:
    settings.prepare_directories()
    command.upgrade(alembic_config(settings), revision)

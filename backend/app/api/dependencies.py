from dataclasses import dataclass

from fastapi import Request

from backend.app.application.capability_service import CapabilityService
from backend.app.application.source_service import SourceService
from backend.app.core.config import Settings
from backend.app.infrastructure.database import Database


@dataclass(slots=True)
class AppContainer:
    settings: Settings
    database: Database
    source_service: SourceService
    capability_service: CapabilityService


def get_container(request: Request) -> AppContainer:
    return request.app.state.container

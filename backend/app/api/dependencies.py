from dataclasses import dataclass

from fastapi import Request

from backend.app.application.capability_service import CapabilityService
from backend.app.application.job_service import JobService
from backend.app.application.source_service import SourceService
from backend.app.application.upload_service import UploadSessionService
from backend.app.core.config import Settings
from backend.app.execution.worker import LocalJobWorker
from backend.app.infrastructure.database import Database


@dataclass(slots=True)
class AppContainer:
    settings: Settings
    database: Database
    source_service: SourceService
    upload_service: UploadSessionService
    job_service: JobService
    capability_service: CapabilityService
    job_worker: LocalJobWorker


def get_container(request: Request) -> AppContainer:
    return request.app.state.container

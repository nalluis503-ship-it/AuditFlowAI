from typing import Annotated

from fastapi import APIRouter, Depends

from backend.app.api.dependencies import AppContainer, get_container
from backend.app.api.schemas import ApiResponse

router = APIRouter(tags=["system"])
Container = Annotated[AppContainer, Depends(get_container)]


@router.get("/")
def root(container: Container) -> dict[str, str]:
    return {
        "name": container.settings.app_name,
        "version": container.settings.app_version,
        "environment": container.settings.environment,
    }


@router.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@router.get("/ready")
def ready(container: Container) -> dict[str, str]:
    container.database.ping()
    container.settings.prepare_directories()
    return {"status": "ready"}


@router.get(
    "/api/v1/status",
    response_model=ApiResponse[dict],
)
def api_status(container: Container) -> ApiResponse[dict]:
    return ApiResponse(
        message="API v1 running",
        data={
            "module": "api-v1",
            "version": container.settings.app_version,
            "simulated_data": False,
            "durable_jobs": True,
            "resumable_uploads": True,
            "local_worker_enabled": container.settings.job_worker_enabled,
            "local_worker_running": container.job_worker.is_running,
        },
    )

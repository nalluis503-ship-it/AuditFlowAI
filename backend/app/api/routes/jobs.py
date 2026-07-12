from typing import Annotated

from fastapi import APIRouter, Depends, Query, status

from backend.app.api.dependencies import AppContainer, get_container
from backend.app.api.schemas import (
    ApiResponse,
    JobCreateRequest,
    JobEventList,
    JobList,
)
from backend.app.domain.job_models import JobRecord, JobStatus

router = APIRouter(
    prefix="/api/v1/jobs",
    tags=["jobs"],
)
Container = Annotated[AppContainer, Depends(get_container)]


@router.post(
    "",
    response_model=ApiResponse[JobRecord],
    status_code=status.HTTP_202_ACCEPTED,
)
def create_job(
    request: JobCreateRequest,
    container: Container,
) -> ApiResponse[JobRecord]:
    job = container.job_service.create(
        job_type=request.job_type,
        payload=request.payload,
        resource_type=request.resource_type,
        resource_id=request.resource_id,
        priority=request.priority,
        max_attempts=request.max_attempts,
        idempotency_key=request.idempotency_key,
    )
    return ApiResponse(
        message="Durable job accepted",
        data=job,
    )


@router.get(
    "",
    response_model=ApiResponse[JobList],
)
def list_jobs(
    container: Container,
    limit: Annotated[int, Query(ge=1, le=200)] = 50,
    offset: Annotated[int, Query(ge=0)] = 0,
    job_status: Annotated[JobStatus | None, Query(alias="status")] = None,
    job_type: Annotated[str | None, Query(min_length=1, max_length=128)] = None,
) -> ApiResponse[JobList]:
    jobs, total = container.job_service.list(
        limit=limit,
        offset=offset,
        status=job_status,
        job_type=job_type,
    )
    return ApiResponse(
        message="Jobs retrieved",
        data=JobList(
            items=jobs,
            total=total,
            limit=limit,
            offset=offset,
            status=job_status,
            job_type=job_type,
        ),
    )


@router.get(
    "/{job_id}",
    response_model=ApiResponse[JobRecord],
)
def get_job(
    job_id: str,
    container: Container,
) -> ApiResponse[JobRecord]:
    return ApiResponse(
        message="Job retrieved",
        data=container.job_service.get(job_id),
    )


@router.get(
    "/{job_id}/events",
    response_model=ApiResponse[JobEventList],
)
def list_job_events(
    job_id: str,
    container: Container,
    limit: Annotated[int, Query(ge=1, le=1000)] = 200,
) -> ApiResponse[JobEventList]:
    events = container.job_service.list_events(job_id, limit=limit)
    return ApiResponse(
        message="Job events retrieved",
        data=JobEventList(items=events, total=len(events)),
    )


@router.post(
    "/{job_id}/cancel",
    response_model=ApiResponse[JobRecord],
)
def cancel_job(
    job_id: str,
    container: Container,
) -> ApiResponse[JobRecord]:
    return ApiResponse(
        message="Cancellation request recorded",
        data=container.job_service.cancel(job_id),
    )


@router.post(
    "/{job_id}/retry",
    response_model=ApiResponse[JobRecord],
    status_code=status.HTTP_202_ACCEPTED,
)
def retry_job(
    job_id: str,
    container: Container,
) -> ApiResponse[JobRecord]:
    return ApiResponse(
        message="Job queued for retry",
        data=container.job_service.retry(job_id),
    )

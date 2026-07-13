from typing import Annotated

from fastapi import (
    APIRouter,
    Depends,
    Header,
    Path,
    Query,
    Request,
    Response,
    status,
)

from backend.app.api.dependencies import AppContainer, get_container
from backend.app.api.schemas import (
    ApiResponse,
    UploadCompletionResult,
    UploadPartList,
    UploadPartView,
    UploadSessionCreateRequest,
    UploadSessionView,
)
from backend.app.domain.upload_models import UploadPartRecord, UploadSessionRecord

router = APIRouter(
    prefix="/api/v1/upload-sessions",
    tags=["upload-sessions"],
)
Container = Annotated[AppContainer, Depends(get_container)]


def _session_view(
    container: AppContainer,
    session: UploadSessionRecord,
) -> UploadSessionView:
    return UploadSessionView(
        **session.model_dump(),
        next_missing_part_number=container.upload_service.next_missing_part(session.id),
    )


def _part_view(part: UploadPartRecord) -> UploadPartView:
    return UploadPartView(
        session_id=part.session_id,
        part_number=part.part_number,
        size_bytes=part.size_bytes,
        sha256=part.sha256,
        created_at=part.created_at,
    )


@router.post(
    "",
    response_model=ApiResponse[UploadSessionView],
    status_code=status.HTTP_201_CREATED,
)
def create_upload_session(
    request: UploadSessionCreateRequest,
    container: Container,
) -> ApiResponse[UploadSessionView]:
    session = container.upload_service.create(
        original_name=request.original_name,
        media_type=request.media_type,
        expected_size_bytes=request.size_bytes,
        part_size_bytes=request.part_size_bytes,
        expected_sha256=request.sha256,
    )
    return ApiResponse(
        message="Resumable upload session created",
        data=_session_view(container, session),
    )


@router.get(
    "/{session_id}",
    response_model=ApiResponse[UploadSessionView],
)
def get_upload_session(
    session_id: str,
    container: Container,
) -> ApiResponse[UploadSessionView]:
    session = container.upload_service.get(session_id)
    return ApiResponse(
        message="Resumable upload session retrieved",
        data=_session_view(container, session),
    )


@router.get(
    "/{session_id}/parts",
    response_model=ApiResponse[UploadPartList],
)
def list_upload_parts(
    session_id: str,
    container: Container,
    limit: Annotated[int, Query(ge=1, le=1000)] = 500,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> ApiResponse[UploadPartList]:
    parts, total = container.upload_service.list_parts_page(
        session_id,
        limit=limit,
        offset=offset,
    )
    return ApiResponse(
        message="Upload parts retrieved",
        data=UploadPartList(
            items=[_part_view(part) for part in parts],
            total=total,
            limit=limit,
            offset=offset,
        ),
    )


@router.put(
    "/{session_id}/parts/{part_number}",
    response_model=ApiResponse[UploadPartView],
)
async def upload_part(
    session_id: str,
    part_number: Annotated[int, Path(ge=1)],
    request: Request,
    container: Container,
    part_sha256: Annotated[
        str,
        Header(alias="X-Part-SHA256", min_length=64, max_length=64),
    ],
) -> ApiResponse[UploadPartView]:
    part = await container.upload_service.upload_part(
        session_id,
        part_number=part_number,
        expected_sha256=part_sha256,
        content=request.stream(),
    )
    return ApiResponse(
        message="Upload part stored and verified",
        data=_part_view(part),
    )


@router.post(
    "/{session_id}/complete",
    response_model=ApiResponse[UploadCompletionResult],
    status_code=status.HTTP_202_ACCEPTED,
)
def complete_upload_session(
    session_id: str,
    container: Container,
) -> ApiResponse[UploadCompletionResult]:
    session = container.upload_service.prepare_completion(session_id)
    job = container.job_service.create(
        job_type="source.complete_upload",
        payload={"upload_session_id": session.id},
        resource_type="upload_session",
        resource_id=session.id,
        idempotency_key=f"source.complete_upload:{session.id}",
    )
    return ApiResponse(
        message="Resumable upload completion job accepted",
        data=UploadCompletionResult(
            upload_session=_session_view(container, session),
            job=job,
            source_id=session.source_id,
        ),
    )


@router.delete(
    "/{session_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def abort_upload_session(
    session_id: str,
    container: Container,
) -> Response:
    container.job_service.ensure_resource_is_idle(
        resource_type="upload_session",
        resource_id=session_id,
    )
    container.upload_service.abort(session_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)

import hashlib
import json
from typing import Annotated

from fastapi import (
    APIRouter,
    Depends,
    File,
    Query,
    Response,
    UploadFile,
    status,
)

from backend.app.api.dependencies import AppContainer, get_container
from backend.app.api.schemas import (
    ApiResponse,
    AsyncReprofileResult,
    AsyncSourceIngestResult,
    ReprofileRequest,
    SourceDetail,
    SourceList,
    SourceSummary,
)
from backend.app.application.source_service import PROFILE_VERSION
from backend.app.domain.models import SourcePreview, SourceProfile, SourceRecord

router = APIRouter(
    prefix="/api/v1/sources",
    tags=["sources"],
)
Container = Annotated[AppContainer, Depends(get_container)]


def _summary(record: SourceRecord) -> SourceSummary:
    return SourceSummary(
        id=record.id,
        original_name=record.original_name,
        extension=record.extension,
        media_type=record.media_type,
        size_bytes=record.size_bytes,
        sha256=record.sha256,
        status=record.status,
        stored_at=record.stored_at,
        updated_at=record.updated_at,
        error_code=record.error_code,
        error_message=record.error_message,
        profile_available=record.profile is not None,
        sheet_count=(len(record.profile.sheets) if record.profile is not None else 0),
        total_rows=(
            sum(sheet.row_count for sheet in record.profile.sheets)
            if record.profile is not None
            else 0
        ),
    )


def _profile_job_key(source_id: str, request: ReprofileRequest) -> str:
    serialized = json.dumps(
        request.model_dump(mode="json"),
        sort_keys=True,
        separators=(",", ":"),
    )
    digest = hashlib.sha256(serialized.encode("utf-8")).hexdigest()[:16]
    return f"source.profile:{source_id}:{PROFILE_VERSION}:{digest}"


@router.post(
    "/ingest",
    response_model=ApiResponse[SourceProfile],
    status_code=status.HTTP_201_CREATED,
    deprecated=True,
)
async def ingest_source(
    container: Container,
    file: Annotated[UploadFile, File(...)],
) -> ApiResponse[SourceProfile]:
    profile = await container.source_service.ingest(file)
    return ApiResponse(
        message="Source ingested and profiled synchronously",
        data=profile,
    )


@router.post(
    "/ingest-async",
    response_model=ApiResponse[AsyncSourceIngestResult],
    status_code=status.HTTP_202_ACCEPTED,
)
async def ingest_source_async(
    container: Container,
    file: Annotated[UploadFile, File(...)],
) -> ApiResponse[AsyncSourceIngestResult]:
    source = await container.source_service.receive(file)
    job = container.job_service.create(
        job_type="source.profile",
        payload={"source_id": source.id, "header_rows": {}},
        resource_type="source",
        resource_id=source.id,
        idempotency_key=(f"source.profile:{source.id}:{PROFILE_VERSION}:default"),
    )
    return ApiResponse(
        message="Source stored and durable profiling job accepted",
        data=AsyncSourceIngestResult(
            source=_summary(source),
            job=job,
        ),
    )


@router.get(
    "",
    response_model=ApiResponse[SourceList],
)
def list_sources(
    container: Container,
    limit: Annotated[int, Query(ge=1, le=200)] = 50,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> ApiResponse[SourceList]:
    records, total = container.source_service.list(limit=limit, offset=offset)
    return ApiResponse(
        message="Sources retrieved",
        data=SourceList(
            items=[_summary(record) for record in records],
            total=total,
            limit=limit,
            offset=offset,
        ),
    )


@router.get(
    "/{source_id}/preview",
    response_model=ApiResponse[SourcePreview],
)
def preview_source(
    source_id: str,
    container: Container,
    sheet: Annotated[str | None, Query(min_length=1, max_length=255)] = None,
    offset: Annotated[int, Query(ge=0, le=100000)] = 0,
    limit: Annotated[int, Query(ge=1, le=200)] = 50,
) -> ApiResponse[SourcePreview]:
    preview = container.source_service.preview(
        source_id,
        sheet_name=sheet,
        offset=offset,
        limit=limit,
    )
    return ApiResponse(
        message="Source preview retrieved",
        data=preview,
    )


@router.get(
    "/{source_id}",
    response_model=ApiResponse[SourceDetail],
)
def get_source(
    source_id: str,
    container: Container,
) -> ApiResponse[SourceDetail]:
    record = container.source_service.get(source_id)
    return ApiResponse(
        message="Source retrieved",
        data=SourceDetail.model_validate(record.model_dump()),
    )


@router.post(
    "/{source_id}/reprofile",
    response_model=ApiResponse[SourceProfile],
    deprecated=True,
)
async def reprofile_source(
    source_id: str,
    request: ReprofileRequest,
    container: Container,
) -> ApiResponse[SourceProfile]:
    profile = await container.source_service.reprofile(
        source_id,
        options=request,
    )
    return ApiResponse(
        message="Source reprofiled synchronously",
        data=profile,
    )


@router.post(
    "/{source_id}/reprofile-async",
    response_model=ApiResponse[AsyncReprofileResult],
    status_code=status.HTTP_202_ACCEPTED,
)
def reprofile_source_async(
    source_id: str,
    request: ReprofileRequest,
    container: Container,
) -> ApiResponse[AsyncReprofileResult]:
    container.source_service.get(source_id)
    job = container.job_service.create(
        job_type="source.profile",
        payload={
            "source_id": source_id,
            "header_rows": request.header_rows,
        },
        resource_type="source",
        resource_id=source_id,
        idempotency_key=_profile_job_key(source_id, request),
    )
    return ApiResponse(
        message="Durable reprofiling job accepted",
        data=AsyncReprofileResult(source_id=source_id, job=job),
    )


@router.delete(
    "/{source_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_source(
    source_id: str,
    container: Container,
) -> Response:
    container.job_service.ensure_resource_is_idle(
        resource_type="source",
        resource_id=source_id,
    )
    container.source_service.delete(source_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)

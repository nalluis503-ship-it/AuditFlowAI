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
    ReprofileRequest,
    SourceDetail,
    SourceList,
    SourceSummary,
)
from backend.app.domain.models import SourceProfile

router = APIRouter(
    prefix="/api/v1/sources",
    tags=["sources"],
)
Container = Annotated[AppContainer, Depends(get_container)]


@router.post(
    "/ingest",
    response_model=ApiResponse[SourceProfile],
    status_code=status.HTTP_201_CREATED,
)
async def ingest_source(
    container: Container,
    file: Annotated[UploadFile, File(...)],
) -> ApiResponse[SourceProfile]:
    profile = await container.source_service.ingest(file)
    return ApiResponse(
        message="Source ingested and profiled",
        data=profile,
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
    records, total = container.source_service.list(
        limit=limit,
        offset=offset,
    )
    return ApiResponse(
        message="Sources retrieved",
        data=SourceList(
            items=[
                SourceSummary(
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
                    sheet_count=(
                        len(record.profile.sheets) if record.profile is not None else 0
                    ),
                    total_rows=(
                        sum(sheet.row_count for sheet in record.profile.sheets)
                        if record.profile is not None
                        else 0
                    ),
                )
                for record in records
            ],
            total=total,
            limit=limit,
            offset=offset,
        ),
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
        message="Source reprofiled",
        data=profile,
    )


@router.delete(
    "/{source_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_source(
    source_id: str,
    container: Container,
) -> Response:
    container.source_service.delete(source_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)

from typing import Annotated

from fastapi import APIRouter, File, HTTPException, UploadFile, status

from backend.app.schemas.api_response import APIResponse
from backend.app.services.source_ingestion import (
    SourceIngestionError,
    ingest_source_file,
)

router = APIRouter(
    prefix="/api/v1/sources",
    tags=["sources"],
)


@router.post(
    "/ingest",
    response_model=APIResponse,
    status_code=status.HTTP_201_CREATED,
)
async def ingest_source(
    file: Annotated[UploadFile, File(...)],
):
    try:
        source_profile = await ingest_source_file(file)
    except SourceIngestionError as exc:
        raise HTTPException(
            status_code=exc.status_code,
            detail=exc.message,
        ) from exc

    return APIResponse(
        success=True,
        message="Source ingested and profiled",
        data=source_profile.model_dump(mode="json"),
    )

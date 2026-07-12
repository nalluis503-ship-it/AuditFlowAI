from typing import Annotated

from fastapi import APIRouter, Depends

from backend.app.api.dependencies import AppContainer, get_container
from backend.app.api.schemas import ApiResponse
from backend.app.application.capability_service import Capability

router = APIRouter(
    prefix="/api/v1/capabilities",
    tags=["capabilities"],
)
Container = Annotated[AppContainer, Depends(get_container)]


@router.get(
    "",
    response_model=ApiResponse[list[Capability]],
)
def list_capabilities(
    container: Container,
) -> ApiResponse[list[Capability]]:
    return ApiResponse(
        message="Executable capabilities retrieved",
        data=container.capability_service.list_available(),
    )

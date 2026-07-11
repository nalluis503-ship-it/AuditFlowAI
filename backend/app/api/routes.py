from fastapi import APIRouter

from backend.app.schemas.api_response import APIResponse

router = APIRouter(prefix="/api/v1", tags=["base"])


@router.get("/status", response_model=APIResponse)
def api_status():
    return APIResponse(
        success=True,
        message="API v1 running",
        data={
            "module": "api-v1",
            "simulated_data": False,
        },
    )

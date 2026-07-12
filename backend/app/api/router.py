from fastapi import APIRouter

from backend.app.api.routes.base import router as base_router
from backend.app.api.routes.capabilities import (
    router as capabilities_router,
)
from backend.app.api.routes.sources import router as sources_router

router = APIRouter()
router.include_router(base_router)
router.include_router(sources_router)
router.include_router(capabilities_router)

from fastapi import APIRouter

from backend.app.api.routes.base import router as base_router
from backend.app.api.routes.capabilities import router as capabilities_router
from backend.app.api.routes.jobs import router as jobs_router
from backend.app.api.routes.sources import router as sources_router
from backend.app.api.routes.tabular_runs import router as tabular_runs_router
from backend.app.api.routes.uploads import router as uploads_router

router = APIRouter()
router.include_router(base_router)
router.include_router(sources_router)
router.include_router(uploads_router)
router.include_router(jobs_router)
router.include_router(tabular_runs_router)
router.include_router(capabilities_router)

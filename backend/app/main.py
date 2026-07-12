import logging
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

from backend.app.api.router import router
from backend.app.api.schemas import ApiError, ApiResponse
from backend.app.bootstrap import build_container
from backend.app.core.config import Settings, get_settings
from backend.app.core.errors import AuditFlowError
from backend.app.core.logging import configure_logging

logger = logging.getLogger(__name__)


def create_app(settings: Settings | None = None) -> FastAPI:
    configure_logging()
    resolved_settings = settings or get_settings()

    @asynccontextmanager
    async def lifespan(app: FastAPI) -> AsyncIterator[None]:
        app.state.container = build_container(resolved_settings)
        yield

    application = FastAPI(
        title=resolved_settings.app_name,
        version=resolved_settings.app_version,
        description=(
            "Traceable data-ingestion and profiling foundation for AuditFlowAI."
        ),
        lifespan=lifespan,
    )
    application.include_router(router)

    @application.exception_handler(AuditFlowError)
    async def auditflow_error_handler(
        request: Request,
        exc: AuditFlowError,
    ) -> JSONResponse:
        logger.warning(
            "application_error path=%s code=%s details=%s",
            request.url.path,
            exc.code,
            exc.details,
        )
        payload = ApiResponse[dict](
            success=False,
            message=exc.message,
            error=ApiError(
                code=exc.code,
                details=exc.details,
            ),
        )
        content = payload.model_dump(mode="json")
        content["detail"] = exc.message
        return JSONResponse(
            status_code=exc.status_code,
            content=content,
        )

    @application.exception_handler(RequestValidationError)
    async def validation_error_handler(
        request: Request,
        exc: RequestValidationError,
    ) -> JSONResponse:
        payload = ApiResponse[dict](
            success=False,
            message="The request is invalid.",
            error=ApiError(
                code="request_validation_error",
                details={"errors": exc.errors()},
            ),
        )
        content = payload.model_dump(mode="json")
        content["detail"] = payload.message
        return JSONResponse(
            status_code=422,
            content=content,
        )

    @application.exception_handler(Exception)
    async def unexpected_error_handler(
        request: Request,
        exc: Exception,
    ) -> JSONResponse:
        logger.exception(
            "unexpected_error path=%s",
            request.url.path,
            exc_info=exc,
        )
        payload = ApiResponse[dict](
            success=False,
            message="An unexpected server error occurred.",
            error=ApiError(
                code="internal_server_error",
            ),
        )
        content = payload.model_dump(mode="json")
        content["detail"] = payload.message
        return JSONResponse(
            status_code=500,
            content=content,
        )

    return application


app = create_app()

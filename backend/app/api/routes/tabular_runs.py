from typing import Annotated

from fastapi import APIRouter, Depends, Query, status

from backend.app.api.dependencies import AppContainer, get_container
from backend.app.api.schemas import (
    ApiResponse,
    TabularRunCreateRequest,
    TabularRunList,
    TabularRunSubmission,
    TabularRunView,
)
from backend.app.core.errors import AuditFlowError
from backend.app.domain.tabular_models import (
    AggregateFunction,
    ExpressionOperator,
    JoinComparison,
    JoinType,
    TabularScalarType,
)

router = APIRouter(
    prefix="/api/v1/tabular-runs",
    tags=["tabular-runs"],
)
Container = Annotated[AppContainer, Depends(get_container)]


def _view(run, container: AppContainer) -> TabularRunView:
    job = container.job_service.get(run.job_id) if run.job_id else None
    return TabularRunView(run=run, job=job)


@router.get(
    "/catalog",
    response_model=ApiResponse[dict],
)
def get_tabular_catalog() -> ApiResponse[dict]:
    return ApiResponse(
        message="Typed tabular operation catalog retrieved",
        data={
            "plan_version": "1.0",
            "step_types": [
                "select",
                "filter",
                "sort",
                "distinct",
                "aggregate",
                "join",
                "union",
                "limit",
            ],
            "expression_operators": [item.value for item in ExpressionOperator],
            "scalar_types": [item.value for item in TabularScalarType],
            "aggregate_functions": [item.value for item in AggregateFunction],
            "join_types": [item.value for item in JoinType],
            "join_comparisons": [item.value for item in JoinComparison],
            "raw_sql_accepted": False,
            "output_format": "parquet",
        },
    )


@router.post(
    "",
    response_model=ApiResponse[TabularRunSubmission],
    status_code=status.HTTP_202_ACCEPTED,
)
def create_tabular_run(
    request: TabularRunCreateRequest,
    container: Container,
) -> ApiResponse[TabularRunSubmission]:
    run = container.tabular_service.create(
        name=request.name,
        output_name=request.output_name,
        plan=request.plan,
        idempotency_key=request.idempotency_key,
    )
    if run.job_id:
        job = container.job_service.get(run.job_id)
    else:
        job = container.job_service.create(
            job_type="tabular.execute",
            payload={"run_id": run.id},
            resource_type="tabular_run",
            resource_id=run.id,
            priority=request.priority,
            max_attempts=request.max_attempts,
            idempotency_key=f"tabular.execute:{run.id}",
        )
        run = container.tabular_service.attach_job(run.id, job.id)
    return ApiResponse(
        message="Typed tabular run accepted",
        data=TabularRunSubmission(run=run, job=job),
    )


@router.get(
    "",
    response_model=ApiResponse[TabularRunList],
)
def list_tabular_runs(
    container: Container,
    limit: Annotated[int, Query(ge=1, le=200)] = 50,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> ApiResponse[TabularRunList]:
    runs, total = container.tabular_service.list(limit=limit, offset=offset)
    return ApiResponse(
        message="Tabular runs retrieved",
        data=TabularRunList(
            items=[_view(run, container) for run in runs],
            total=total,
            limit=limit,
            offset=offset,
        ),
    )


@router.get(
    "/{run_id}",
    response_model=ApiResponse[TabularRunView],
)
def get_tabular_run(
    run_id: str,
    container: Container,
) -> ApiResponse[TabularRunView]:
    return ApiResponse(
        message="Tabular run retrieved",
        data=_view(container.tabular_service.get(run_id), container),
    )


@router.post(
    "/{run_id}/cancel",
    response_model=ApiResponse[TabularRunView],
)
def cancel_tabular_run(
    run_id: str,
    container: Container,
) -> ApiResponse[TabularRunView]:
    run = container.tabular_service.get(run_id)
    if not run.job_id:
        raise AuditFlowError(
            "The tabular run does not have an attached durable job.",
            code="tabular_run_job_missing",
            status_code=409,
            details={"run_id": run_id},
        )
    container.job_service.cancel(run.job_id)
    return ApiResponse(
        message="Tabular run cancellation recorded",
        data=_view(run, container),
    )


@router.post(
    "/{run_id}/retry",
    response_model=ApiResponse[TabularRunView],
    status_code=status.HTTP_202_ACCEPTED,
)
def retry_tabular_run(
    run_id: str,
    container: Container,
) -> ApiResponse[TabularRunView]:
    run = container.tabular_service.get(run_id)
    if not run.job_id:
        raise AuditFlowError(
            "The tabular run does not have an attached durable job.",
            code="tabular_run_job_missing",
            status_code=409,
            details={"run_id": run_id},
        )
    container.job_service.retry(run.job_id)
    return ApiResponse(
        message="Tabular run queued for retry",
        data=_view(run, container),
    )

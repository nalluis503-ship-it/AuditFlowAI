from fastapi import APIRouter
from backend.app.schemas.api_response import APIResponse
from backend.app.schemas.workflow import WorkflowResponse
from backend.app.schemas.node import NodeResponse

router = APIRouter(prefix="/api/v1", tags=["base"])


@router.get("/status", response_model=APIResponse)
def api_status():
    return APIResponse(
        success=True,
        message="API v1 running",
        data={
            "module": "api-v1"
        }
    )


@router.get("/workflows", response_model=APIResponse)
def list_workflows():
    sample_workflow = WorkflowResponse(
        id="workflow_001",
        name="Workflow base",
        mode="free_workspace",
        status="draft"
    )

    return APIResponse(
        success=True,
        message="Workflow API base ready",
        data={
            "items": [sample_workflow.model_dump()]
        }
    )


@router.get("/nodes", response_model=APIResponse)
def list_nodes():
    sample_node = NodeResponse(
        id="node_001",
        type="file_loader",
        name="Cargar Archivo",
        category="data",
        status="idle",
        outputs=["file"]
    )

    return APIResponse(
        success=True,
        message="Node API base ready",
        data={
            "items": [sample_node.model_dump()]
        }
    )

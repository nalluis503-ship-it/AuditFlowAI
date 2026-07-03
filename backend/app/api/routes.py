from fastapi import APIRouter

router = APIRouter(prefix="/api/v1", tags=["base"])

@router.get("/status")
def api_status():
    return {
        "status": "ok",
        "module": "api-v1"
    }

@router.get("/workflows")
def list_workflows():
    return {
        "items": [],
        "message": "Workflow API base ready"
    }

@router.get("/nodes")
def list_nodes():
    return {
        "items": [],
        "message": "Node API base ready"
    }

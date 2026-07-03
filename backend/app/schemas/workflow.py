from pydantic import BaseModel
from typing import List, Dict, Any, Optional


class WorkflowBase(BaseModel):
    name: str
    mode: str = "free_workspace"
    status: str = "draft"


class WorkflowCreate(WorkflowBase):
    pass


class WorkflowResponse(WorkflowBase):
    id: str
    version: str = "0.1"
    nodes: List[Dict[str, Any]] = []
    edges: List[Dict[str, Any]] = []
    metadata: Optional[Dict[str, Any]] = None

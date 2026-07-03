from pydantic import BaseModel
from typing import List, Dict, Any, Optional


class NodeBase(BaseModel):
    type: str
    name: str
    category: str
    status: str = "idle"


class NodeCreate(NodeBase):
    config: Dict[str, Any] = {}


class NodeResponse(NodeBase):
    id: str
    position: Dict[str, int] = {
        "x": 0,
        "y": 0
    }
    inputs: List[str] = []
    outputs: List[str] = []
    config: Dict[str, Any] = {}
    result: Optional[Dict[str, Any]] = None
    logs: List[Dict[str, Any]] = []

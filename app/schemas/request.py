from datetime import datetime
from typing import Literal
from pydantic import BaseModel
from pydantic import BaseModel, Field


class RequestCreate(BaseModel):
    title: str = Field(min_length=3, max_length=200)
    description: str = Field(min_length=5)
    category: str = Field(min_length=2, max_length=100)
    priority: str = Field(default="medium", max_length=20)
    workflow_id: int | None = None

class RequestStatusUpdate(BaseModel):
    status: Literal["pending", "approved", "rejected"]
    
class RequestResponse(BaseModel):
    id: int
    organization_id: int
    created_by: int
    title: str
    description: str
    category: str
    priority: str
    status: str
    workflow_id: int | None
    current_step: int
    created_at: datetime
    updated_at: datetime
    

    model_config = {
        "from_attributes": True
    }


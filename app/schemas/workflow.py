from datetime import datetime

from pydantic import BaseModel, Field


class WorkflowCreate(BaseModel):
    name: str = Field(min_length=3, max_length=150)
    description: str | None = Field(
        default=None,
        max_length=500,
    )


class WorkflowResponse(BaseModel):
    id: int
    organization_id: int
    name: str
    description: str | None
    is_active: bool
    created_at: datetime

    model_config = {
        "from_attributes": True,
    }

class WorkflowStepCreate(BaseModel):
    name: str = Field(min_length=3, max_length=150)
    step_order: int = Field(ge=1)
    approver_role: str = Field(min_length=3, max_length=50)


class WorkflowStepResponse(BaseModel):
    id: int
    workflow_id: int
    step_order: int
    name: str
    approver_role: str

    model_config = {
        "from_attributes": True,
    }


class WorkflowDetailResponse(WorkflowResponse):
    steps: list[WorkflowStepResponse] = []
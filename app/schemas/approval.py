from datetime import datetime

from pydantic import BaseModel, Field


class ApprovalCreate(BaseModel):
    decision: str = Field(
        min_length=3,
        max_length=30,
    )

    comment: str | None = Field(
        default=None,
        max_length=1000,
    )


class ApprovalResponse(BaseModel):
    id: int
    request_id: int
    workflow_step_id: int | None
    approver_id: int
    decision: str
    comment: str | None
    created_at: datetime

    model_config = {"from_attributes": True}
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_user
from app.auth.permissions import require_roles
from app.database.dependencies import get_db
from app.models.user import User
from app.models.workflow import Workflow
from app.schemas.workflow import WorkflowCreate, WorkflowDetailResponse, WorkflowResponse
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from app.models.workflow_step import WorkflowStep
from app.schemas.workflow import (
    WorkflowCreate,
    WorkflowResponse,
    WorkflowStepCreate,
    WorkflowStepResponse,
)


router = APIRouter(
    prefix="/workflows",
    tags=["Workflows"],
)


@router.post(
    "",
    response_model=WorkflowResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_workflow(
    workflow_data: WorkflowCreate,
    current_user: User = Depends(
        require_roles("admin", "manager")
    ),
    db: Session = Depends(get_db),
):
    workflow = Workflow(
        organization_id=current_user.organization_id,
        name=workflow_data.name,
        description=workflow_data.description,
        is_active=True,
    )

    db.add(workflow)
    db.commit()
    db.refresh(workflow)

    return workflow


@router.post(
    "/{workflow_id}/steps",
    response_model=WorkflowStepResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_workflow_step(
    workflow_id: int,
    step_data: WorkflowStepCreate,
    current_user: User = Depends(
        require_roles("admin", "manager")
    ),
    db: Session = Depends(get_db),
):
    workflow = db.scalar(
        select(Workflow).where(
            Workflow.id == workflow_id,
            Workflow.organization_id == current_user.organization_id,
        )
    )

    if not workflow:
        raise HTTPException(
            status_code=404,
            detail="Workflow not found",
        )

    existing_step = db.scalar(
        select(WorkflowStep).where(
            WorkflowStep.workflow_id == workflow_id,
            WorkflowStep.step_order == step_data.step_order,
        )
    )

    if existing_step:
        raise HTTPException(
            status_code=409,
            detail="A step with this order already exists",
        )

    step = WorkflowStep(
        workflow_id=workflow_id,
        step_order=step_data.step_order,
        name=step_data.name,
        approver_role=step_data.approver_role,
    )

    db.add(step)
    db.commit()
    db.refresh(step)

    return step


@router.get(
    "/{workflow_id}",
    response_model=WorkflowDetailResponse,
)
def get_workflow(
    workflow_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    workflow = db.scalar(
        select(Workflow).where(
            Workflow.id == workflow_id,
            Workflow.organization_id == current_user.organization_id,
        )
    )

    if not workflow:
        raise HTTPException(
            status_code=404,
            detail="Workflow not found",
        )

    steps = db.scalars(
        select(WorkflowStep)
        .where(WorkflowStep.workflow_id == workflow_id)
        .order_by(WorkflowStep.step_order)
    ).all()

    return {
        "id": workflow.id,
        "organization_id": workflow.organization_id,
        "name": workflow.name,
        "description": workflow.description,
        "is_active": workflow.is_active,
        "created_at": workflow.created_at,
        "steps": steps,
    }
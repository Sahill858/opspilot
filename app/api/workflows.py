from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_user
from app.auth.permissions import require_roles
from app.database.dependencies import get_db

from app.models.user import User
from app.models.workflow import Workflow
from app.models.workflow_step import WorkflowStep
from app.models.approval import Approval
from app.models.request import Request

from app.schemas.workflow import (
    WorkflowCreate,
    WorkflowResponse,
    WorkflowDetailResponse,
    WorkflowStepCreate,
    WorkflowStepResponse,
    WorkflowUpdate,
    WorkflowStepUpdate,
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

@router.patch(
    "/{workflow_id}",
    response_model=WorkflowResponse,
)
def update_workflow(
    workflow_id: int,
    workflow_data: WorkflowUpdate,
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

    update_data = workflow_data.model_dump(exclude_unset=True)

    if not update_data:
        raise HTTPException(
            status_code=422,
            detail="Provide at least one field to update",
        )

    if "name" in update_data and update_data["name"] is None:
        raise HTTPException(
            status_code=422,
            detail="Workflow name cannot be null",
        )

    for field, value in update_data.items():
        setattr(workflow, field, value)

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

@router.patch(
    "/{workflow_id}/steps/{step_id}",
    response_model=WorkflowStepResponse,
)
def update_workflow_step(
    workflow_id: int,
    step_id: int,
    step_data: WorkflowStepUpdate,
    current_user: User = Depends(
        require_roles("admin", "manager")
    ),
    db: Session = Depends(get_db),
):
    # Verify workflow belongs to the user's organization
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

    # Find the step inside this workflow
    step = db.scalar(
        select(WorkflowStep).where(
            WorkflowStep.id == step_id,
            WorkflowStep.workflow_id == workflow_id,
        )
    )

    if not step:
        raise HTTPException(
            status_code=404,
            detail="Workflow step not found",
        )

    update_data = step_data.model_dump(exclude_unset=True)

    if not update_data:
        raise HTTPException(
            status_code=422,
            detail="Provide at least one field to update",
        )

    if any(value is None for value in update_data.values()):
        raise HTTPException(
            status_code=422,
            detail="Workflow step fields cannot be null",
        )

    # Prevent changing the approver role after approval history exists
    if (
        "approver_role" in update_data
        and update_data["approver_role"] != step.approver_role
    ):
        existing_approval = db.scalar(
            select(Approval.id).where(
                Approval.workflow_step_id == step_id
            ).limit(1)
        )

        if existing_approval:
            raise HTTPException(
                status_code=409,
                detail="Cannot change approver role because this step has approval history",
            )

    for field, value in update_data.items():
        setattr(step, field, value)

    db.commit()
    db.refresh(step)

    return step


@router.delete(
    "/{workflow_id}/steps/{step_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_workflow_step(
    workflow_id: int,
    step_id: int,
    current_user: User = Depends(
        require_roles("admin", "manager")
    ),
    db: Session = Depends(get_db),
):
    # 1. Verify workflow belongs to the user's organization
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

    # 2. Find the step
    step = db.scalar(
        select(WorkflowStep).where(
            WorkflowStep.id == step_id,
            WorkflowStep.workflow_id == workflow_id,
        )
    )

    if not step:
        raise HTTPException(
            status_code=404,
            detail="Workflow step not found",
        )

    # 3. Prevent deletion if approval history exists
    existing_approval = db.scalar(
        select(Approval.id).where(
            Approval.workflow_step_id == step_id
        ).limit(1)
    )

    if existing_approval:
        raise HTTPException(
            status_code=409,
            detail="Cannot delete this step because approval history exists",
        )

    # 4. Prevent deletion if pending requests use this workflow
    pending_request = db.scalar(
        select(Request.id).where(
            Request.workflow_id == workflow_id,
            Request.status == "pending",
        ).limit(1)
    )

    if pending_request:
        raise HTTPException(
            status_code=409,
            detail="Cannot delete workflow steps while pending requests exist",
        )

    # 5. Only allow deleting the last step
    later_step = db.scalar(
        select(WorkflowStep.id).where(
            WorkflowStep.workflow_id == workflow_id,
            WorkflowStep.step_order > step.step_order,
        ).limit(1)
    )

    if later_step:
        raise HTTPException(
            status_code=409,
            detail="Delete steps from the last step backwards",
        )

    # 6. Delete the step
    db.delete(step)
    db.commit()

    return None
@router.delete(
    "/{workflow_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_workflow(
    workflow_id: int,
    current_user: User = Depends(
        require_roles("admin", "manager")
    ),
    db: Session = Depends(get_db),
):
    # 1. Verify workflow ownership
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

    # 2. Check whether any requests reference this workflow
    existing_request = db.scalar(
        select(Request.id).where(
            Request.workflow_id == workflow_id
        ).limit(1)
    )

    if existing_request:
        raise HTTPException(
            status_code=409,
            detail="Cannot delete this workflow because requests are associated with it",
        )

    # 3. Get all workflow steps
    steps = db.scalars(
        select(WorkflowStep).where(
            WorkflowStep.workflow_id == workflow_id
        )
    ).all()

    # 4. Protect existing approval history
    step_ids = [step.id for step in steps]

    if step_ids:
        existing_approval = db.scalar(
            select(Approval.id).where(
                Approval.workflow_step_id.in_(step_ids)
            ).limit(1)
        )

        if existing_approval:
            raise HTTPException(
                status_code=409,
                detail="Cannot delete this workflow because approval history exists",
            )

    # 5. Delete workflow steps first
    for step in steps:
        db.delete(step)
        
    db.flush()
    # 6. Delete workflow
    db.delete(workflow)

    db.commit()

    return None
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

@router.get(
    "",
    response_model=list[WorkflowResponse],
)
def get_workflows(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    workflows = db.scalars(
        select(Workflow).where(
            Workflow.organization_id == current_user.organization_id,
            Workflow.is_active.is_(True),
        ).order_by(Workflow.created_at.desc())
    ).all()

    return workflows
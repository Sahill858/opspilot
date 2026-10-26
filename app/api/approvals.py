from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_user
from app.auth.permissions import require_roles
from app.database.dependencies import get_db
from app.models.approval import Approval
from app.models.request import Request
from app.models.user import User
from app.schemas.approval import ApprovalCreate, ApprovalResponse
from app.models.workflow_step import WorkflowStep


router = APIRouter(
    prefix="/requests",
    tags=["Approvals"],
)


@router.post(
    "/{request_id}/approval",
    response_model=ApprovalResponse,
    status_code=status.HTTP_201_CREATED,
)

def create_approval(
    request_id: int,
    approval_data: ApprovalCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # 1. Find the request within the user's organization
    request = db.scalar(
        select(Request).where(
            Request.id == request_id,
            Request.organization_id == current_user.organization_id,
        )
    )

    if not request:
        raise HTTPException(
            status_code=404,
            detail="Request not found",
        )

    # 2. Ensure the request is still pending
    if request.status != "pending":
        raise HTTPException(
            status_code=400,
            detail="Request is no longer pending",
        )

    # 3. Validate the decision
    if approval_data.decision not in {"approved", "rejected"}:
        raise HTTPException(
            status_code=400,
            detail="Decision must be approved or rejected",
        )

    # 4. Ensure a workflow is assigned
    if not request.workflow_id:
        raise HTTPException(
            status_code=400,
            detail="No workflow is assigned to this request",
        )

    # 5. Find the current workflow step
    current_workflow_step = db.scalar(
        select(WorkflowStep).where(
            WorkflowStep.workflow_id == request.workflow_id,
            WorkflowStep.step_order == request.current_step,
        )
    )

    if not current_workflow_step:
        raise HTTPException(
            status_code=400,
            detail="Current workflow step not found",
        )

    # 6. Prevent duplicate approval by the same user for this step
    
    # Check whether this user has already submitted a decision
    # for any step of this request.
    existing_approval = db.scalar(
        select(Approval).where(
            Approval.request_id == request.id,
            Approval.approver_id == current_user.id,
        )
    )

    if existing_approval:
        raise HTTPException(
            status_code=409,
            detail="You have already submitted a decision for this request",
        )


    if existing_approval:
        raise HTTPException(
            status_code=409,
            detail="You have already submitted a decision for this workflow step",
        )

    # 7. Check whether the user has the required role
    if current_user.role != current_workflow_step.approver_role:
        raise HTTPException(
            status_code=403,
            detail=(
                f"This step requires the "
                f"'{current_workflow_step.approver_role}' role"
            ),
        )

    # 8. Record the approval decision
    approval = Approval(
        request_id=request.id,
        workflow_step_id=current_workflow_step.id,
        approver_id=current_user.id,
        decision=approval_data.decision,
        comment=approval_data.comment,
    )

    # 9. Reject the request or advance the workflow
    if approval_data.decision == "rejected":
        request.status = "rejected"

    else:
        next_step = db.scalar(
            select(WorkflowStep).where(
                WorkflowStep.workflow_id == request.workflow_id,
                WorkflowStep.step_order > request.current_step,
            ).order_by(WorkflowStep.step_order.asc())
        )

        if next_step:
            request.current_step = next_step.step_order
        else:
            request.status = "approved"

    # 10. Save changes to the database
    try:
        db.add(approval)
        db.commit()
        db.refresh(approval)

    except Exception:
        db.rollback()
        raise

    return approval



@router.get(
    "/{request_id}/approvals",
    response_model=list[ApprovalResponse],
)
def get_approval_history(
    request_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    request = db.scalar(
        select(Request).where(
            Request.id == request_id,
            Request.organization_id == current_user.organization_id,
        )
    )

    if not request:
        raise HTTPException(
            status_code=404,
            detail="Request not found",
        )

    approvals = db.scalars(
        select(Approval)
        .where(Approval.request_id == request_id)
        .order_by(Approval.created_at.desc())
    ).all()

    return approvals
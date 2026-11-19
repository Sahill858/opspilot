from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from app.auth.dependencies import get_current_user
from app.auth.permissions import require_roles
from app.database.dependencies import get_db
from app.models.approval import Approval
from app.services.activity_log_service import create_activity_log
from app.models.request import Request
from app.models.user import User
from app.services.notification_service import create_notification
from app.schemas.approval import (
    ApprovalCreate,
    ApprovalResponse,
    ApprovalHistoryResponse,
)
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
    # 1. Find the request within the user's organization.
    request = db.scalar(
        select(Request)
        .where(
            Request.id == request_id,
            Request.organization_id == current_user.organization_id,
        )
        .with_for_update()
    )

    if not request:
        raise HTTPException(
            status_code=404,
            detail="Request not found",
        )

    # 2. Ensure the request is still pending.
    if request.status != "pending":
        raise HTTPException(
            status_code=400,
            detail="Request is no longer pending",
        )

    # 3. Validate the decision.
    if approval_data.decision not in {"approved", "rejected"}:
        raise HTTPException(
            status_code=400,
            detail="Decision must be approved or rejected",
        )

    # 4. Ensure a workflow is assigned.
    if not request.workflow_id:
        raise HTTPException(
            status_code=400,
            detail="No workflow is assigned to this request",
        )

    # 5. Find the current workflow step.
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

    # 6. Prevent duplicate approvals.
    existing_approval = db.scalar(
        select(Approval).where(
            Approval.request_id == request.id,
            Approval.approver_id == current_user.id,
        )
    )

    if existing_approval:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="You have already submitted a decision for this request",
        )

    # 7. Check the user's role.
    if current_user.role != current_workflow_step.approver_role:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=(
                f"This step requires the "
                f"'{current_workflow_step.approver_role}' role"
            ),
        )

    # 8. Record the approval decision.
    approval = Approval(
        request_id=request.id,
        workflow_step_id=current_workflow_step.id,
        approver_id=current_user.id,
        decision=approval_data.decision,
        comment=approval_data.comment,
    )

    db.add(approval)

    # 9. Find the employee who created the request.
    requester = db.scalar(
        select(User).where(
            User.id == request.created_by,
            User.organization_id == current_user.organization_id,
        )
    )
    # Prepare activity log details.
    activity_action = ""
    activity_description = ""
    # 10. Handle rejection.
    if approval_data.decision == "rejected":
        request.status = "rejected"
        activity_action = "request_rejected"
        activity_description = (
            f'{current_user.full_name} rejected request '
            f'"{request.title}" at workflow step '
            f'{request.current_step}.'
        )
        if requester:
            create_notification(
                db=db,
                organization_id=request.organization_id,
                user_id=requester.id,
                title="Request Rejected",
                message=(
                    f'Your request "{request.title}" '
                    f'was rejected by {current_user.full_name}.'
                ),
                notification_type="request_update",
                link=f"/requests/{request.id}",
            )

    else:
        # 11. Find the next workflow step.
        activity_action = "request_approved"
        activity_description = (
            f'{current_user.full_name} approved request '
            f'"{request.title}" at workflow step '
            f'{request.current_step}.'
        )
        next_step = db.scalar(
            select(WorkflowStep)
            .where(
                WorkflowStep.workflow_id == request.workflow_id,
                WorkflowStep.step_order > request.current_step,
            )
            .order_by(WorkflowStep.step_order.asc())
        )

        if next_step:
            request.current_step = next_step.step_order

            # 12. Find active users for the next approval step.
            next_approvers = db.scalars(
                select(User).where(
                    User.organization_id == request.organization_id,
                    User.role == next_step.approver_role,
                    User.is_active.is_(True),
                )
            ).all()

            # 13. Notify the next approvers.
            for approver in next_approvers:
                create_notification(
                    db=db,
                    organization_id=request.organization_id,
                    user_id=approver.id,
                    title="Request Requires Your Approval",
                    message=(
                        f'Request "{request.title}" '
                        f'has been approved by {current_user.full_name} '
                        f'and is waiting for your approval.'
                    ),
                    notification_type="approval",
                    link="/approvals",
                )

        else:
            # 14. Final approval completed.
            request.status = "approved"

            if requester:
                create_notification(
                    db=db,
                    organization_id=request.organization_id,
                    user_id=requester.id,
                    title="Request Approved",
                    message=(
                        f'Your request "{request.title}" '
                        f'has been fully approved.'
                    ),
                    notification_type="request_update",
                    link=f"/requests/{request.id}",
                )
    create_activity_log(
        db=db,
        organization_id=request.organization_id,
        user_id=current_user.id,
        action=activity_action,
        description=activity_description,
        entity_type="request",
        entity_id=request.id,
    )
    # 15. Save approval, request status, and notifications together.
    try:
        db.commit()
        db.refresh(approval)

    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This approval conflicts with an existing database record",
        ) from exc

    except Exception:
        db.rollback()
        raise

    return approval



@router.get(
    "/{request_id}/approvals",
    response_model=list[ApprovalHistoryResponse],
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

    results = db.execute(
        select(
            Approval,
            User.full_name,
            User.role,
        )
        .outerjoin(
            User,
            Approval.approver_id == User.id,
        )
        .where(
            Approval.request_id == request_id
        )
        .order_by(Approval.created_at.desc())
    ).all()

    approval_history = []

    for approval_record, approver_name, approver_role in results:
        approval_history.append(
            {
                "id": approval_record.id,
                "request_id": approval_record.request_id,
                "workflow_step_id": approval_record.workflow_step_id,
                "approver_id": approval_record.approver_id,
                "approver_name": approver_name,
                "approver_role": approver_role,
                "decision": approval_record.decision,
                "comment": approval_record.comment,
                "created_at": approval_record.created_at,
            }
        )

    return approval_history

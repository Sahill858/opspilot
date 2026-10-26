from app.auth.permissions import require_roles
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_user
from app.database.dependencies import get_db
from app.models.request import Request
from app.models.user import User
from app.schemas.request import (
    RequestCreate,
    RequestResponse,
    RequestStatusUpdate,
)
from fastapi import HTTPException
from sqlalchemy import select
from app.models.workflow import Workflow

router = APIRouter(
    prefix="/requests",
    tags=["Requests"],
)


@router.post(
    "",
    response_model=RequestResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_request(
    request_data: RequestCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):  
    workflow = None

    if request_data.workflow_id is not None:
        workflow = db.scalar(
            select(Workflow).where(
            Workflow.id == request_data.workflow_id,
            Workflow.organization_id == current_user.organization_id,
            Workflow.is_active.is_(True),
        )
    )

    if not workflow:
        raise HTTPException(
            status_code=404,
            detail="Workflow not found or inactive",
        )
    new_request = Request(
        organization_id=current_user.organization_id,
        created_by=current_user.id,
        title=request_data.title,
        description=request_data.description,
        category=request_data.category,
        priority=request_data.priority,
        status="pending",
        workflow_id=workflow.id if workflow else None,
        current_step=1,
    )

    db.add(new_request)
    db.commit()
    db.refresh(new_request)

    return new_request


@router.get(
    "",
    response_model=list[RequestResponse],
)
def list_requests(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    requests = db.scalars(
        select(Request)
        .where(Request.organization_id == current_user.organization_id)
        .order_by(Request.created_at.desc())
    ).all()

    return requests

@router.get(
    "/{request_id}",
    response_model=RequestResponse,
)
def get_request(
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

    return request



@router.patch(
    "/{request_id}/status",
    response_model=RequestResponse,
)
def update_request_status(
    request_id: int,
    status_data: RequestStatusUpdate,
    current_user: User = Depends(require_roles("admin", "manager", "approver")),
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
    # Prevent changes to completed requests.
    if request.status in ("approved", "rejected"):
        raise HTTPException(
            status_code=409,
            detail="Completed requests cannot be reopened or modified",
        )
    # Approval decisions must go through the workflow approval endpoint.
    if status_data.status in ("approved", "rejected") and request.workflow_id:
        raise HTTPException(
            status_code=409,
            detail="Requests with a workflow must be approved or rejected through the approval endpoint",
        )

    request.status = status_data.status

    db.commit()
    db.refresh(request)

    return request

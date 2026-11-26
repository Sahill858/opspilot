
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import select, func, case

from app.auth.dependencies import get_current_user
from app.database.dependencies import get_db

from app.models.user import User
from app.models.request import Request
from app.models.workflow import Workflow
from app.models.workflow_step import WorkflowStep
from app.models.approval import Approval

from app.schemas.analytics import AnalyticsResponse


router = APIRouter(
    prefix="/analytics",
    tags=["Analytics"],
)


def get_analytics_requests_query(current_user: User):
    query = select(Request).where(
        Request.organization_id == current_user.organization_id
    )

    if current_user.role == "employee":
        query = query.where(
            Request.created_by == current_user.id
        )

    elif current_user.role == "approver":
        query = query.join(
            Workflow,
            Request.workflow_id == Workflow.id,
        ).join(
            WorkflowStep,
            (WorkflowStep.workflow_id == Workflow.id)
            & (WorkflowStep.step_order == Request.current_step),
        ).where(
            Workflow.organization_id == current_user.organization_id,
            WorkflowStep.approver_role == current_user.role,
            Request.status == "pending",
        )

    elif current_user.role not in ("admin", "manager"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to view analytics",
        )

    return query


@router.get("/", response_model=AnalyticsResponse)
def get_analytics(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    request_query = get_analytics_requests_query(current_user)
    requests_subquery = request_query.subquery()

    # 1. Summary
    total_requests = db.scalar(
        select(func.count()).select_from(requests_subquery)
    ) or 0

    status_results = db.execute(
        select(
            requests_subquery.c.status,
            func.count(),
        )
        .group_by(requests_subquery.c.status)
    ).all()

    status_counts = {
        request_status: count
        for request_status, count in status_results
    }

    summary = {
        "total_requests": total_requests,
        "pending_requests": status_counts.get("pending", 0),
        "approved_requests": status_counts.get("approved", 0),
        "rejected_requests": status_counts.get("rejected", 0),
    }

    # 2. Priority Distribution
    priority_results = db.execute(
        select(
            requests_subquery.c.priority,
            func.count(),
        )
        .group_by(requests_subquery.c.priority)
    ).all()

    priority_distribution = [
        {"name": priority, "total": count}
        for priority, count in priority_results
    ]

    # 3. Monthly Request Trend
    month_expression = func.date_trunc(
        "month",
        requests_subquery.c.created_at,
    )

    monthly_results = db.execute(
        select(
            month_expression.label("month_date"),
            func.count().label("total"),
        )
        .group_by(month_expression)
        .order_by(month_expression)
    ).all()

    monthly_trend = [
        {
            "month": month_date.strftime("%Y-%m"),
            "total": total,
        }
        for month_date, total in monthly_results
    ]

    # 4. Approval Performance
    approval_query = (
        select(
            func.count(Approval.id).label("total"),
            func.sum(
                case(
                    (Approval.decision == "approved", 1),
                    else_=0,
                )
            ).label("approved"),
            func.sum(
                case(
                    (Approval.decision == "rejected", 1),
                    else_=0,
                )
            ).label("rejected"),
        )
        .join(
            Request,
            Approval.request_id == Request.id,
        )
    )

    if current_user.role in ("admin", "manager"):
        approval_query = approval_query.where(
            Request.organization_id == current_user.organization_id
        )

    elif current_user.role == "approver":
        approval_query = approval_query.where(
            Request.organization_id == current_user.organization_id,
            Approval.approver_id == current_user.id,
        )

    else:
        approval_query = None

    if approval_query is not None:
        approval_result = db.execute(approval_query).one()

        total_approvals = approval_result.total or 0
        approved = approval_result.approved or 0
        rejected = approval_result.rejected or 0

    else:
        total_approvals = 0
        approved = 0
        rejected = 0

    approval_rate = (
        round((approved / total_approvals) * 100, 2)
        if total_approvals > 0
        else 0
    )

    # 5. Response
    return {
        "summary": summary,
        "monthly_trend": monthly_trend,
        "status_distribution": [
            {"name": request_status, "total": count}
            for request_status, count in status_results
        ],
        "priority_distribution": priority_distribution,
        "approval_performance": {
            "total_approvals": total_approvals,
            "approved": approved,
            "rejected": rejected,
            "approval_rate": approval_rate,
        },
    }

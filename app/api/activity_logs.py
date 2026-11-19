
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_user
from app.auth.permissions import require_roles
from app.database.dependencies import get_db
from app.models.activity_log import ActivityLog
from app.models.user import User
from app.schemas.activity_log import ActivityLogResponse

router = APIRouter(
    prefix="/activity-logs",
    tags=["Activity Logs"],
)


@router.get(
    "/",
    response_model=list[ActivityLogResponse],
)
def get_activity_logs(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin")),
):
    logs = (
        db.query(ActivityLog)
        .filter(
            ActivityLog.organization_id == current_user.organization_id,
        )
        .order_by(ActivityLog.created_at.desc())
        .limit(100)
        .all()
    )

    return logs

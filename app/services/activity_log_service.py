
from sqlalchemy.orm import Session

from app.models.activity_log import ActivityLog


def create_activity_log(
    db: Session,
    organization_id: int,
    action: str,
    description: str,
    user_id: int | None = None,
    entity_type: str | None = None,
    entity_id: int | None = None,
):
    activity = ActivityLog(
        organization_id=organization_id,
        user_id=user_id,
        action=action,
        description=description,
        entity_type=entity_type,
        entity_id=entity_id,
    )

    db.add(activity)

    return activity


from sqlalchemy.orm import Session

from app.models.notification import Notification


def create_notification(
    db: Session,
    organization_id: int,
    user_id: int,
    title: str,
    message: str,
    notification_type: str,
    link: str | None = None,
):
    notification = Notification(
        organization_id=organization_id,
        user_id=user_id,
        title=title,
        message=message,
        notification_type=notification_type,
        link=link,
    )

    db.add(notification)

    return notification

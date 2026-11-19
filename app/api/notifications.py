
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_user
from app.database.dependencies import get_db
from app.models.notification import Notification
from app.models.user import User
from app.schemas.notification import (
    NotificationResponse,
    NotificationReadUpdate,
)

router = APIRouter(
    prefix="/notifications",
    tags=["Notifications"],
)


@router.get("/", response_model=list[NotificationResponse])
def get_notifications(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    notifications = (
        db.query(Notification)
        .filter(
            Notification.organization_id == current_user.organization_id,
            Notification.user_id == current_user.id,
        )
        .order_by(Notification.created_at.desc())
        .all()
    )

    return notifications


@router.get("/unread-count")
def get_unread_count(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    count = (
        db.query(Notification)
        .filter(
            Notification.organization_id == current_user.organization_id,
            Notification.user_id == current_user.id,
            Notification.is_read.is_(False),
        )
        .count()
    )

    return {"unread_count": count}


@router.patch(
    "/{notification_id}/read",
    response_model=NotificationResponse,
)
def update_notification_read_status(
    notification_id: int,
    payload: NotificationReadUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    notification = (
        db.query(Notification)
        .filter(
            Notification.id == notification_id,
            Notification.organization_id == current_user.organization_id,
            Notification.user_id == current_user.id,
        )
        .first()
    )

    if not notification:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found",
        )

    notification.is_read = payload.is_read

    db.commit()
    db.refresh(notification)

    return notification

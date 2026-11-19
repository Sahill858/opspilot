
from datetime import datetime

from pydantic import BaseModel, ConfigDict


class NotificationResponse(BaseModel):
    id: int
    title: str
    message: str
    notification_type: str
    link: str | None
    is_read: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class NotificationReadUpdate(BaseModel):
    is_read: bool

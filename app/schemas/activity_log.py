
from datetime import datetime

from pydantic import BaseModel, ConfigDict


class ActivityLogResponse(BaseModel):
    id: int
    user_id: int | None
    user_name: str | None
    action: str
    description: str
    entity_type: str | None
    entity_id: int | None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

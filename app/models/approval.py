from datetime import datetime,timezone

from sqlalchemy import DateTime, ForeignKey, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.database.base import Base


class Approval(Base):
    __tablename__ = "approvals"
    __table_args__ = (
        UniqueConstraint(
            "request_id",
            "approver_id",
            name="uq_approval_request_approver",
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True, index=True)

    request_id: Mapped[int] = mapped_column(
        ForeignKey("requests.id"),
        nullable=False,
        index=True,
    )

    approver_id: Mapped[int] = mapped_column(
        ForeignKey("users.id"),
        nullable=False,
        index=True,
    )

    decision: Mapped[str] = mapped_column(
        String(30),
        nullable=False,
    )

    comment: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    created_at: Mapped[datetime] = mapped_column(
       default=lambda: datetime.now(timezone.utc),
       nullable=False,
    )

    workflow_step_id: Mapped[int | None] = mapped_column(
        ForeignKey("workflow_steps.id"),
        nullable=True,
        index=True,
    )
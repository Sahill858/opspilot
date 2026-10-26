
from sqlalchemy import ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.database.base import Base


class WorkflowStep(Base):
    __tablename__ = "workflow_steps"

    __table_args__ = (
        UniqueConstraint(
            "workflow_id",
            "step_order",
            name="uq_workflow_step_order",
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True, index=True)

    workflow_id: Mapped[int] = mapped_column(
        ForeignKey("workflows.id"),
        nullable=False,
        index=True,
    )

    step_order: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
    )

    name: Mapped[str] = mapped_column(
        String(150),
        nullable=False,
    )

    approver_role: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
    )

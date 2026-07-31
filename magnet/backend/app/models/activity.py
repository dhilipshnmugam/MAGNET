import uuid
from datetime import datetime, date
from sqlalchemy import (
    Column, String, Integer, Float, Date, DateTime,
    ForeignKey, UniqueConstraint
)
from sqlalchemy.orm import relationship
from app.database import Base
from app.types import GUID


class UserActivity(Base):
    __tablename__ = "user_activities"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    user_id = Column(GUID(), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    activity_date = Column(Date, nullable=False)
    action_count = Column(Integer, nullable=False, default=0)
    hours_spent = Column(Float, nullable=False, default=0.0)

    user = relationship("User", back_populates="activities")

    __table_args__ = (
        UniqueConstraint("user_id", "activity_date", name="uq_user_activity_date"),
    )

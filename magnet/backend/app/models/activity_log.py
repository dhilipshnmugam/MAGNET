import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, ForeignKey, CheckConstraint, Text
from sqlalchemy.orm import relationship
from app.database import Base
from app.types import GUID


class ActivityLog(Base):
    __tablename__ = "activity_logs"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    user_id = Column(GUID(), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    action = Column(String(50), nullable=False, index=True)
    entity_type = Column(String(30), nullable=True)
    entity_id = Column(GUID(), nullable=True)
    ip_address = Column(String(45), nullable=True)
    user_agent = Column(String(500), nullable=True)
    metadata_ = Column("metadata", Text, nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow, index=True)

    user = relationship("User", back_populates="activity_logs")

    __table_args__ = (
        CheckConstraint(
            "action IN ('login', 'logout', 'register', 'post_create', 'post_delete', 'comment_create', 'like_toggle', 'message_send', 'channel_create', 'announcement_create', 'event_create', 'profile_update', 'role_change', 'account_ban', 'account_delete')",
            name="chk_activity_logs_action"
        ),
    )

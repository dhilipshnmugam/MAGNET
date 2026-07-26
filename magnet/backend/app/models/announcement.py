import uuid
from datetime import datetime
from sqlalchemy import Column, String, Text, Boolean, DateTime, ForeignKey, CheckConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.database import Base


class Announcement(Base):
    __tablename__ = "announcements"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    author_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    content = Column(Text, nullable=False)
    target_type = Column(String(20), nullable=False, default="all")
    target_value = Column(Text, nullable=True)
    is_pinned = Column(Boolean, nullable=False, default=True)
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    author = relationship("User", back_populates="announcements", foreign_keys=[author_id])

    __table_args__ = (
        CheckConstraint("target_type IN ('all', 'department', 'channel', 'users')", name="chk_announcements_target"),
    )

import uuid
from datetime import datetime
from sqlalchemy import (
    Column, String, Text, Boolean, DateTime, SmallInteger,
    ForeignKey, CheckConstraint, Index
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.database import Base


NOTIFICATION_TYPES = (
    "'post', 'like', 'comment', 'mention', 'event', 'event_reminder',"
    "'approval', 'rejected', 'leaderboard', 'message', 'announcement',"
    "'channel_invite', 'system'"
)


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    sender_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    type = Column(String(30), nullable=False)
    title = Column(String(255), nullable=False)
    body = Column(Text, nullable=False)
    ref_type = Column(String(30), nullable=True)
    ref_id = Column(UUID(as_uuid=True), nullable=True)
    sender_name = Column(String(255), nullable=True)
    sender_avatar = Column(Text, nullable=True)
    is_read = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)

    user = relationship("User", foreign_keys=[user_id], back_populates="notifications")
    sender = relationship("User", foreign_keys=[sender_id])

    __table_args__ = (
        CheckConstraint(
            f"type IN ({NOTIFICATION_TYPES})",
            name="chk_notifications_type"
        ),
        Index("ix_notifications_user_unread", "user_id", "is_read", postgresql_where="is_read = false"),
        Index("ix_notifications_user_created", "user_id", "created_at"),
    )


class FCMToken(Base):
    __tablename__ = "fcm_tokens"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    token = Column(Text, unique=True, nullable=False)
    device_info = Column(String(255), nullable=True)
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)

    user = relationship("User", back_populates="fcm_tokens")


class NotificationPreference(Base):
    __tablename__ = "notification_preferences"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    push_enabled = Column(Boolean, nullable=False, default=True)
    email_enabled = Column(Boolean, nullable=False, default=True)
    post_notifs = Column(Boolean, nullable=False, default=True)
    like_notifs = Column(Boolean, nullable=False, default=True)
    comment_notifs = Column(Boolean, nullable=False, default=True)
    mention_notifs = Column(Boolean, nullable=False, default=True)
    event_notifs = Column(Boolean, nullable=False, default=True)
    approval_notifs = Column(Boolean, nullable=False, default=True)
    leaderboard_notifs = Column(Boolean, nullable=False, default=True)
    message_notifs = Column(Boolean, nullable=False, default=True)
    announcement_notifs = Column(Boolean, nullable=False, default=True)
    channel_notifs = Column(Boolean, nullable=False, default=True)
    updated_at = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", back_populates="notification_prefs")

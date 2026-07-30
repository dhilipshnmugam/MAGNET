import uuid
from datetime import datetime
from sqlalchemy import (
    Column, String, Text, Boolean, DateTime, Integer,
    ForeignKey, UniqueConstraint, CheckConstraint
)
from sqlalchemy.orm import relationship
from app.database import Base
from app.types import GUID


class Channel(Base):
    __tablename__ = "channels"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    name = Column(String(100), nullable=False)
    slug = Column(String(100), unique=True, nullable=False, index=True)
    description = Column(Text, nullable=True)
    type = Column(String(10), nullable=False, default="public", index=True)
    icon_url = Column(Text, nullable=True)
    owner_id = Column(GUID(), ForeignKey("users.id", ondelete="RESTRICT"), nullable=False, index=True)
    department_id = Column(GUID(), ForeignKey("departments.id", ondelete="SET NULL"), nullable=True, index=True)
    member_count = Column(Integer, nullable=False, default=0)
    is_active = Column(Boolean, nullable=False, default=True, index=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    owner = relationship("User", foreign_keys=[owner_id], back_populates="owned_channels")
    department = relationship("Department", back_populates="channels", foreign_keys=[department_id])
    members = relationship("ChannelMember", back_populates="channel", cascade="all, delete-orphan")
    posts = relationship("Post", back_populates="channel", foreign_keys="Post.channel_id")
    messages = relationship("ChannelMessage", back_populates="channel", cascade="all, delete-orphan")

    __table_args__ = (
        CheckConstraint("type IN ('public', 'private')", name="chk_channels_type"),
    )


class ChannelMember(Base):
    __tablename__ = "channel_members"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    channel_id = Column(GUID(), ForeignKey("channels.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(GUID(), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    role = Column(String(10), nullable=False, default="member")
    joined_at = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)

    channel = relationship("Channel", back_populates="members")
    user = relationship("User", back_populates="channel_memberships")

    __table_args__ = (
        UniqueConstraint("channel_id", "user_id", name="uq_channel_members_channel_user"),
        CheckConstraint("role IN ('owner', 'admin', 'member')", name="chk_channel_members_role"),
    )


class ChannelMessage(Base):
    __tablename__ = "channel_messages"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    channel_id = Column(GUID(), ForeignKey("channels.id", ondelete="CASCADE"), nullable=False)
    sender_id = Column(GUID(), ForeignKey("users.id", ondelete="RESTRICT"), nullable=False, index=True)
    content = Column(Text, nullable=True)
    image_url = Column(Text, nullable=True)
    is_deleted = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)

    channel = relationship("Channel", back_populates="messages")
    sender = relationship("User", foreign_keys=[sender_id])

    __table_args__ = (
        CheckConstraint("content IS NOT NULL OR image_url IS NOT NULL", name="chk_cm_content"),
    )

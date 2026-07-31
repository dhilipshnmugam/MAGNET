import uuid
import json
from datetime import datetime
from sqlalchemy import (
    Column, Text, Boolean, DateTime, String, Integer, Float,
    ForeignKey, CheckConstraint, UniqueConstraint
)
from sqlalchemy.orm import relationship
from app.database import Base
from app.types import GUID


class Conversation(Base):
    """A 1:1 direct messaging conversation between two users."""
    __tablename__ = "conversations"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    created_at = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    participants = relationship("ConversationParticipant", back_populates="conversation", cascade="all, delete-orphan")
    messages = relationship("DirectMessage", back_populates="conversation", cascade="all, delete-orphan")


class ConversationParticipant(Base):
    """Per-user conversation state: pin, archive, mute, last read time."""
    __tablename__ = "conversation_participants"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    conversation_id = Column(GUID(), ForeignKey("conversations.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(GUID(), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    last_read_at = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)
    is_pinned = Column(Boolean, nullable=False, default=False)
    is_archived = Column(Boolean, nullable=False, default=False)
    is_muted = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)

    conversation = relationship("Conversation", back_populates="participants")
    user = relationship("User", back_populates="conversation_participations")

    __table_args__ = (
        UniqueConstraint("conversation_id", "user_id", name="uq_conv_participant"),
    )


class MessageAttachment(Base):
    """Attachments on a direct message (image, video, audio, document, gif)."""
    __tablename__ = "message_attachments"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    message_id = Column(GUID(), ForeignKey("direct_messages.id", ondelete="CASCADE"), nullable=False, index=True)
    file_type = Column(String(20), nullable=False, default="file")  # image|video|audio|document|gif|pdf
    file_url = Column(Text, nullable=False)
    file_name = Column(String(255), nullable=True)
    file_size = Column(Integer, nullable=True)
    mime_type = Column(String(120), nullable=True)
    duration = Column(Float, nullable=True)
    width = Column(Integer, nullable=True)
    height = Column(Integer, nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)

    message = relationship("DirectMessage", back_populates="attachments")


class MessageReaction(Base):
    """Emoji reactions on a message."""
    __tablename__ = "message_reactions"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    message_id = Column(GUID(), ForeignKey("direct_messages.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(GUID(), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    emoji = Column(String(32), nullable=False)
    created_at = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)

    user = relationship("User", back_populates="message_reactions")
    message = relationship("DirectMessage", back_populates="reactions")

    __table_args__ = (
        UniqueConstraint("message_id", "user_id", "emoji", name="uq_msg_reaction"),
    )


class BlockedUser(Base):
    """User blocking another user (both directions blocked)."""
    __tablename__ = "blocked_users"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    blocker_id = Column(GUID(), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    blocked_id = Column(GUID(), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)

    blocker = relationship("User", foreign_keys=[blocker_id], back_populates="blocking")
    blocked = relationship("User", foreign_keys=[blocked_id], back_populates="blocked_by")

    __table_args__ = (
        UniqueConstraint("blocker_id", "blocked_id", name="uq_blocked_pair"),
        CheckConstraint("blocker_id != blocked_id", name="chk_block_no_self"),
    )


class DirectMessage(Base):
    __tablename__ = "direct_messages"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    conversation_id = Column(GUID(), ForeignKey("conversations.id", ondelete="CASCADE"), nullable=True, index=True)
    sender_id = Column(GUID(), ForeignKey("users.id", ondelete="RESTRICT"), nullable=False, index=True)
    receiver_id = Column(GUID(), ForeignKey("users.id", ondelete="RESTRICT"), nullable=False, index=True)
    content = Column(Text, nullable=True)
    image_url = Column(Text, nullable=True)

    message_type = Column(String(30), nullable=False, default="text", index=True)
    # text | emoji | image | video | audio | file | gif | link | post | profile | event | club | department

    reply_to_id = Column(GUID(), ForeignKey("direct_messages.id", ondelete="SET NULL"), nullable=True)
    forwarded_from_id = Column(GUID(), nullable=True)
    is_forwarded = Column(Boolean, nullable=False, default=False)
    is_edited = Column(Boolean, nullable=False, default=False)
    is_starred = Column(Boolean, nullable=False, default=False)
    is_pinned = Column(Boolean, nullable=False, default=False)
    is_deleted = Column(Boolean, nullable=False, default=False)
    deleted_for = Column(Text, nullable=True)  # JSON array of user_ids who deleted "for me"
    edited_at = Column(DateTime(timezone=True), nullable=True)

    share_type = Column(String(20), nullable=True)  # post | profile | event | club | department
    share_id = Column(GUID(), nullable=True)
    share_preview = Column(Text, nullable=True)  # JSON snapshot of shared entity

    link_title = Column(String(300), nullable=True)
    link_description = Column(Text, nullable=True)
    link_image = Column(Text, nullable=True)

    is_read = Column(Boolean, nullable=False, default=False)
    delivered_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    sender = relationship("User", back_populates="sent_messages", foreign_keys=[sender_id])
    receiver = relationship("User", back_populates="received_messages", foreign_keys=[receiver_id])
    conversation = relationship("Conversation", back_populates="messages")
    attachments = relationship("MessageAttachment", back_populates="message", cascade="all, delete-orphan")
    reactions = relationship("MessageReaction", back_populates="message", cascade="all, delete-orphan")
    reply_to = relationship("DirectMessage", remote_side=[id], post_update=True)

    __table_args__ = (
        CheckConstraint("sender_id != receiver_id", name="chk_dm_no_self"),
        CheckConstraint("content IS NOT NULL OR image_url IS NOT NULL", name="chk_dm_content"),
    )

    @property
    def deleted_for_ids(self) -> list:
        try:
            return json.loads(self.deleted_for) if self.deleted_for else []
        except (ValueError, TypeError):
            return []

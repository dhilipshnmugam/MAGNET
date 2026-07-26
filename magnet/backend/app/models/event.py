import uuid
from datetime import datetime
from sqlalchemy import (
    Column, String, Text, DateTime, Integer,
    ForeignKey, UniqueConstraint, CheckConstraint
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.database import Base


class Event(Base):
    __tablename__ = "events"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    creator_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="RESTRICT"), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    event_date = Column(DateTime(timezone=True), nullable=False)
    end_date = Column(DateTime(timezone=True), nullable=True)
    venue = Column(String(255), nullable=True)
    event_type = Column(String(50), nullable=False, default="general", index=True)
    banner_url = Column(Text, nullable=True)
    rsvp_count = Column(Integer, nullable=False, default=0)
    created_at = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    creator = relationship("User", foreign_keys=[creator_id], back_populates="created_events")
    rsvps = relationship("RSVP", back_populates="event", cascade="all, delete-orphan")


class RSVP(Base):
    __tablename__ = "rsvps"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    event_id = Column(UUID(as_uuid=True), ForeignKey("events.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    status = Column(String(15), nullable=False)
    created_at = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    event = relationship("Event", back_populates="rsvps")
    user = relationship("User", back_populates="rsvps")

    __table_args__ = (
        UniqueConstraint("event_id", "user_id", name="uq_rsvps_event_user"),
        CheckConstraint("status IN ('going', 'interested', 'not_going')", name="chk_rsvps_status"),
    )

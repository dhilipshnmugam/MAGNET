import uuid
from datetime import datetime
from sqlalchemy import (
    Column, String, Text, Integer, Boolean, DateTime,
    ForeignKey, UniqueConstraint, CheckConstraint
)
from sqlalchemy.orm import relationship
from app.database import Base
from app.types import GUID


class ClubRole(Base):
    __tablename__ = "club_roles"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    club_member_id = Column(GUID(), ForeignKey("club_members.id", ondelete="CASCADE"), nullable=False)
    role = Column(String(50), nullable=False)
    created_at = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)

    member = relationship("ClubMember", back_populates="roles")


class ClubAssignment(Base):
    __tablename__ = "club_assignments"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    club_member_id = Column(GUID(), ForeignKey("club_members.id", ondelete="CASCADE"), nullable=False)
    assigned_by = Column(GUID(), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    deadline = Column(DateTime(timezone=True), nullable=True)
    priority = Column(String(20), nullable=False, default="medium")
    status = Column(String(20), nullable=False, default="pending")
    created_at = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    member = relationship("ClubMember", back_populates="assignments")
    assigner = relationship("User", foreign_keys=[assigned_by])

    __table_args__ = (
        CheckConstraint("priority IN ('low', 'medium', 'high', 'urgent')", name="chk_assignment_priority"),
        CheckConstraint("status IN ('pending', 'in_progress', 'completed')", name="chk_assignment_status"),
    )

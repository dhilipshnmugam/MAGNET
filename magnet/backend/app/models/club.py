import uuid
from datetime import datetime
from sqlalchemy import (
    Column, String, Text, Boolean, DateTime,
    ForeignKey, UniqueConstraint, CheckConstraint
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.database import Base


class Club(Base):
    __tablename__ = "clubs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(150), unique=True, nullable=False, index=True)
    club_code = Column(String(20), unique=True, nullable=False, index=True)
    description = Column(Text, nullable=True)
    domain = Column(String(100), nullable=True)
    icon_url = Column(Text, nullable=True)
    banner_url = Column(Text, nullable=True)
    owner_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="RESTRICT"), nullable=False, index=True)
    department_id = Column(UUID(as_uuid=True), ForeignKey("departments.id", ondelete="SET NULL"), nullable=True, index=True)
    faculty_coordinator_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    club_admin_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    email = Column(String(255), nullable=True)
    phone = Column(String(15), nullable=True)
    is_active = Column(Boolean, nullable=False, default=True, index=True)
    status = Column(String(20), nullable=False, default="active")
    created_at = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    owner = relationship("User", foreign_keys=[owner_id], back_populates="owned_clubs")
    department = relationship("Department", back_populates="clubs", foreign_keys=[department_id])
    faculty_coordinator = relationship("User", foreign_keys=[faculty_coordinator_id])
    club_admin = relationship("User", foreign_keys=[club_admin_id])
    members = relationship("ClubMember", back_populates="club", cascade="all, delete-orphan")
    posts = relationship("Post", back_populates="club", foreign_keys="Post.club_id")
    ranking = relationship("ClubRanking", back_populates="club", uselist=False)


class ClubMember(Base):
    __tablename__ = "club_members"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    club_id = Column(UUID(as_uuid=True), ForeignKey("clubs.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    role = Column(String(20), nullable=False, default="member")
    joined_at = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)

    club = relationship("Club", back_populates="members")
    user = relationship("User", back_populates="club_memberships")

    __table_args__ = (
        UniqueConstraint("club_id", "user_id", name="uq_club_members_club_user"),
        CheckConstraint("role IN ('owner', 'admin', 'member')", name="chk_club_members_role"),
    )

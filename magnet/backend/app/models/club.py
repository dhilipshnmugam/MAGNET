import uuid
from datetime import datetime
from sqlalchemy import (
    Column, String, Text, Integer, Boolean, DateTime,
    ForeignKey, UniqueConstraint, CheckConstraint
)
from sqlalchemy.orm import relationship
from app.database import Base
from app.types import GUID


class Club(Base):
    __tablename__ = "clubs"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    name = Column(String(150), unique=True, nullable=False, index=True)
    club_code = Column(String(20), unique=True, nullable=False, index=True)
    description = Column(Text, nullable=True, index=True)
    category = Column(String(50), nullable=True, index=True)
    domain = Column(String(100), nullable=True)
    club_type = Column(String(30), nullable=True, default="technical")
    icon_url = Column(Text, nullable=True)
    banner_url = Column(Text, nullable=True)
    owner_id = Column(GUID(), ForeignKey("users.id", ondelete="RESTRICT"), nullable=False, index=True)
    department_id = Column(GUID(), ForeignKey("departments.id", ondelete="SET NULL"), nullable=True, index=True)
    faculty_coordinator_id = Column(GUID(), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    club_admin_id = Column(GUID(), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_by = Column(GUID(), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    official_email = Column(String(255), nullable=True)
    official_phone = Column(String(15), nullable=True)
    website = Column(String(255), nullable=True)
    instagram = Column(String(150), nullable=True)
    linkedin = Column(String(255), nullable=True)
    approval_mode = Column(String(20), nullable=False, default="manual")
    is_active = Column(Boolean, nullable=False, default=True, index=True)
    status = Column(String(20), nullable=False, default="active")
    created_at = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    owner = relationship("User", foreign_keys=[owner_id], back_populates="owned_clubs")
    creator = relationship("User", foreign_keys=[created_by])
    department = relationship("Department", back_populates="clubs", foreign_keys=[department_id])
    faculty_coordinator = relationship("User", foreign_keys=[faculty_coordinator_id])
    club_admin = relationship("User", foreign_keys=[club_admin_id])
    members = relationship("ClubMember", back_populates="club", cascade="all, delete-orphan")
    join_requests = relationship("ClubJoinRequest", back_populates="club", cascade="all, delete-orphan")
    posts = relationship("Post", back_populates="club", foreign_keys="Post.club_id")
    events = relationship("ClubEvent", back_populates="club", cascade="all, delete-orphan")
    gallery_items = relationship("ClubGallery", back_populates="club", cascade="all, delete-orphan")
    achievements = relationship("ClubAchievement", back_populates="club", cascade="all, delete-orphan")
    ranking = relationship("ClubRanking", back_populates="club", uselist=False)


class ClubMember(Base):
    __tablename__ = "club_members"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    club_id = Column(GUID(), ForeignKey("clubs.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(GUID(), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    role = Column(String(20), nullable=False, default="member")
    joined_at = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)

    club = relationship("Club", back_populates="members")
    user = relationship("User", back_populates="club_memberships")
    roles = relationship("ClubRole", back_populates="member", cascade="all, delete-orphan")
    assignments = relationship("ClubAssignment", back_populates="member", cascade="all, delete-orphan")

    __table_args__ = (
        UniqueConstraint("club_id", "user_id", name="uq_club_members_club_user"),
        CheckConstraint("role IN ('owner', 'admin', 'member')", name="chk_club_members_role"),
    )


class ClubJoinRequest(Base):
    __tablename__ = "club_join_requests"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    club_id = Column(GUID(), ForeignKey("clubs.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(GUID(), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    status = Column(String(20), nullable=False, default="pending")
    message = Column(Text, nullable=True)
    reviewed_by = Column(GUID(), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    reviewed_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)

    club = relationship("Club", back_populates="join_requests")
    user = relationship("User", foreign_keys=[user_id])
    reviewer = relationship("User", foreign_keys=[reviewed_by])

    __table_args__ = (
        UniqueConstraint("club_id", "user_id", name="uq_club_join_requests_club_user_pending"),
        CheckConstraint("status IN ('pending', 'approved', 'rejected')", name="chk_club_join_requests_status"),
    )


class ClubEvent(Base):
    __tablename__ = "club_events"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    club_id = Column(GUID(), ForeignKey("clubs.id", ondelete="CASCADE"), nullable=False)
    created_by = Column(GUID(), ForeignKey("users.id", ondelete="RESTRICT"), nullable=False)
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    event_date = Column(DateTime(timezone=True), nullable=False)
    end_date = Column(DateTime(timezone=True), nullable=True)
    venue = Column(String(200), nullable=True)
    event_type = Column(String(50), nullable=False, default="general")
    banner_url = Column(Text, nullable=True)
    rsvp_count = Column(Integer, nullable=False, default=0)
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    club = relationship("Club", back_populates="events")
    creator = relationship("User", foreign_keys=[created_by])


class ClubGallery(Base):
    __tablename__ = "club_gallery"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    club_id = Column(GUID(), ForeignKey("clubs.id", ondelete="CASCADE"), nullable=False)
    uploaded_by = Column(GUID(), ForeignKey("users.id", ondelete="RESTRICT"), nullable=False)
    image_url = Column(Text, nullable=False)
    caption = Column(Text, nullable=True)
    event_name = Column(String(200), nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)

    club = relationship("Club", back_populates="gallery_items")
    uploader = relationship("User", foreign_keys=[uploaded_by])


class ClubAchievement(Base):
    __tablename__ = "club_achievements"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    club_id = Column(GUID(), ForeignKey("clubs.id", ondelete="CASCADE"), nullable=False)
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    achievement_type = Column(String(50), nullable=False, default="general")
    achieved_date = Column(DateTime(timezone=True), nullable=True)
    certificate_url = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)

    club = relationship("Club", back_populates="achievements")

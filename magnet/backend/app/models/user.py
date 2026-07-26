import uuid
from datetime import datetime
from sqlalchemy import (
    Column, String, Text, Boolean, DateTime, SmallInteger,
    ForeignKey, CheckConstraint
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    full_name = Column(String(150), nullable=False)
    role = Column(String(20), nullable=False, default="student")
    avatar_url = Column(Text, nullable=True)
    bio = Column(String(500), nullable=True)
    department_id = Column(UUID(as_uuid=True), ForeignKey("departments.id", ondelete="SET NULL"), nullable=True, index=True)
    is_verified = Column(Boolean, nullable=False, default=False)
    is_active = Column(Boolean, nullable=False, default=True, index=True)
    last_login_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    department = relationship("Department", back_populates="users", foreign_keys=[department_id])
    student_profile = relationship("Student", back_populates="user", uselist=False, cascade="all, delete-orphan")
    hod_profile = relationship("Hod", back_populates="user", uselist=False, cascade="all, delete-orphan")
    posts = relationship("Post", back_populates="author", cascade="all, delete-orphan")
    comments = relationship("Comment", back_populates="author", cascade="all, delete-orphan")
    likes = relationship("Like", back_populates="user", cascade="all, delete-orphan")
    bookmarks = relationship("Bookmark", back_populates="user", cascade="all, delete-orphan")
    owned_channels = relationship("Channel", back_populates="owner", foreign_keys="Channel.owner_id")
    channel_memberships = relationship("ChannelMember", back_populates="user", cascade="all, delete-orphan")
    sent_messages = relationship("DirectMessage", back_populates="sender", foreign_keys="DirectMessage.sender_id")
    received_messages = relationship("DirectMessage", back_populates="receiver", foreign_keys="DirectMessage.receiver_id")
    announcements = relationship("Announcement", back_populates="author", cascade="all, delete-orphan")
    created_events = relationship("Event", back_populates="creator", foreign_keys="Event.creator_id")
    rsvps = relationship("RSVP", back_populates="user", cascade="all, delete-orphan")
    notifications = relationship("Notification", back_populates="user", foreign_keys="Notification.user_id", cascade="all, delete-orphan")
    fcm_tokens = relationship("FCMToken", back_populates="user", cascade="all, delete-orphan")
    notification_prefs = relationship("NotificationPreference", back_populates="user", uselist=False, cascade="all, delete-orphan")
    points = relationship("Point", back_populates="user", cascade="all, delete-orphan")
    leaderboard_entry = relationship("Leaderboard", back_populates="user", uselist=False, cascade="all, delete-orphan")
    activity_logs = relationship("ActivityLog", back_populates="user")
    owned_clubs = relationship("Club", back_populates="owner", foreign_keys="Club.owner_id")
    club_memberships = relationship("ClubMember", back_populates="user", cascade="all, delete-orphan")
    approval_requests = relationship("ApprovalRequest", back_populates="user", foreign_keys="ApprovalRequest.user_id")

    __table_args__ = (
        CheckConstraint("role IN ('student', 'department_admin', 'super_admin', 'club_admin', 'principal')", name="chk_users_role"),
    )

    @property
    def department_name(self):
        try:
            return self.department.name if self.department else None
        except Exception:
            return None

    def __repr__(self):
        return f"<User {self.email}>"


class Student(Base):
    __tablename__ = "students"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    college_id = Column(String(50), unique=True, nullable=False, index=True)
    roll_number = Column(String(30), nullable=True)
    year_of_study = Column(SmallInteger, nullable=True)
    semester = Column(SmallInteger, nullable=True)
    section = Column(String(10), nullable=True)
    phone = Column(String(15), nullable=True)
    admission_year = Column(SmallInteger, nullable=True)
    graduation_year = Column(SmallInteger, nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", back_populates="student_profile")

    __table_args__ = (
        CheckConstraint("year_of_study IS NULL OR (year_of_study >= 1 AND year_of_study <= 5)", name="chk_students_year"),
        CheckConstraint("semester IS NULL OR (semester >= 1 AND semester <= 10)", name="chk_students_semester"),
    )


class Hod(Base):
    __tablename__ = "hods"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    employee_id = Column(String(50), unique=True, nullable=False, index=True)
    designation = Column(String(100), nullable=True)
    qualification = Column(String(255), nullable=True)
    specialization = Column(String(255), nullable=True)
    join_date = Column(DateTime(timezone=True), nullable=True)
    office_room = Column(String(50), nullable=True)
    phone = Column(String(15), nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", back_populates="hod_profile")

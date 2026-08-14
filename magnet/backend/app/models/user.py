import uuid
from datetime import datetime
from sqlalchemy import (
    Column, String, Text, Boolean, DateTime, SmallInteger,
    ForeignKey, CheckConstraint, UniqueConstraint
)
from sqlalchemy.orm import relationship
from app.database import Base
from app.types import GUID


class User(Base):
    __tablename__ = "users"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    full_name = Column(String(150), nullable=False, index=True)
    role = Column(String(20), nullable=False, default="student", index=True)
    avatar_url = Column(Text, nullable=True)
    cover_url = Column(Text, nullable=True)
    bio = Column(String(500), nullable=True, index=True)
    department_id = Column(GUID(), ForeignKey("departments.id", ondelete="SET NULL"), nullable=True, index=True)
    year = Column(String(20), nullable=True)
    register_number = Column(String(50), unique=True, nullable=True, index=True)
    college_name = Column(String(255), nullable=True)
    is_verified = Column(Boolean, nullable=False, default=False)
    is_active = Column(Boolean, nullable=False, default=True, index=True)
    last_login_at = Column(DateTime(timezone=True), nullable=True)
    last_seen_at = Column(DateTime(timezone=True), nullable=True)
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
    conversation_participations = relationship("ConversationParticipant", back_populates="user", cascade="all, delete-orphan")
    message_reactions = relationship("MessageReaction", back_populates="user", cascade="all, delete-orphan")
    blocking = relationship("BlockedUser", back_populates="blocker", foreign_keys="BlockedUser.blocker_id", cascade="all, delete-orphan")
    blocked_by = relationship("BlockedUser", back_populates="blocked", foreign_keys="BlockedUser.blocked_id", cascade="all, delete-orphan")
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
    following_rel = relationship("UserFollow", foreign_keys="UserFollow.follower_id", back_populates="follower", cascade="all, delete-orphan")
    followers_rel = relationship("UserFollow", foreign_keys="UserFollow.following_id", back_populates="following", cascade="all, delete-orphan")
    owned_projects = relationship("Project", back_populates="owner", foreign_keys="Project.owner_id", cascade="all, delete-orphan")
    project_memberships = relationship("ProjectMember", back_populates="user", cascade="all, delete-orphan")
    project_interests = relationship("ProjectInterest", back_populates="user", cascade="all, delete-orphan")
    activities = relationship("UserActivity", back_populates="user", cascade="all, delete-orphan")
    stories = relationship("Story", back_populates="creator", foreign_keys="Story.creator_id", cascade="all, delete-orphan")
    story_likes = relationship("StoryLike", back_populates="user", cascade="all, delete-orphan")
    story_comments = relationship("StoryComment", back_populates="author", cascade="all, delete-orphan")
    story_views = relationship("StoryView", back_populates="user", cascade="all, delete-orphan")

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

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    user_id = Column(GUID(), ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
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

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    user_id = Column(GUID(), ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
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


class UserFollow(Base):
    __tablename__ = "user_follows"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    follower_id = Column(GUID(), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    following_id = Column(GUID(), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)

    follower = relationship("User", foreign_keys=[follower_id], back_populates="following_rel")
    following = relationship("User", foreign_keys=[following_id], back_populates="followers_rel")

    __table_args__ = (
        CheckConstraint("follower_id != following_id", name="chk_no_self_follow"),
        UniqueConstraint("follower_id", "following_id", name="uq_user_follows_pair"),
    )

import uuid
from datetime import datetime
from sqlalchemy import (
    Column, String, DateTime, Integer, SmallInteger,
    ForeignKey, CheckConstraint, Index, UniqueConstraint
)
from sqlalchemy.orm import relationship
from app.database import Base
from app.types import GUID


class Point(Base):
    __tablename__ = "points"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    user_id = Column(GUID(), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    activity_type = Column(String(30), nullable=False)
    points_value = Column(SmallInteger, nullable=False)
    ref_type = Column(String(30), nullable=True)
    ref_id = Column(GUID(), nullable=True)
    description = Column(String(255), nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)

    user = relationship("User", back_populates="points")

    __table_args__ = (
        CheckConstraint(
            "activity_type IN ("
            "'post_created', 'post_liked', 'post_unliked',"
            "'comment_added', 'event_created', 'event_attended',"
            "'club_activity', 'announcement_made',"
            "'daily_login', 'streak_bonus', 'penalty', 'admin_adjustment',"
            "'profile_completed'"
            ")",
            name="chk_points_activity_type"
        ),
        Index("ix_points_user_created", "user_id", "created_at"),
        Index("ix_points_created", "created_at"),
        Index("ix_points_activity_type", "activity_type"),
    )


class Leaderboard(Base):
    __tablename__ = "leaderboard"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    user_id = Column(GUID(), ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    total_points = Column(Integer, nullable=False, default=0)
    rank = Column(Integer, nullable=True)
    streak_days = Column(SmallInteger, nullable=False, default=0)
    last_active = Column(DateTime(timezone=True), nullable=True)
    updated_at = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", back_populates="leaderboard_entry")

    __table_args__ = (
        Index("ix_leaderboard_points_desc", "total_points"),
    )


class ClubRanking(Base):
    __tablename__ = "club_rankings"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    club_id = Column(GUID(), ForeignKey("clubs.id", ondelete="CASCADE"), unique=True, nullable=False)
    total_points = Column(Integer, nullable=False, default=0)
    total_posts = Column(Integer, nullable=False, default=0)
    total_events = Column(Integer, nullable=False, default=0)
    total_members_active = Column(Integer, nullable=False, default=0)
    rank = Column(Integer, nullable=True)
    updated_at = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    club = relationship("Club", back_populates="ranking")

    __table_args__ = (
        Index("ix_club_rankings_points", "total_points"),
    )


class DepartmentRanking(Base):
    __tablename__ = "department_rankings"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    department_id = Column(GUID(), ForeignKey("departments.id", ondelete="CASCADE"), unique=True, nullable=False)
    total_points = Column(Integer, nullable=False, default=0)
    total_students = Column(Integer, nullable=False, default=0)
    total_posts = Column(Integer, nullable=False, default=0)
    total_clubs = Column(Integer, nullable=False, default=0)
    rank = Column(Integer, nullable=True)
    updated_at = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    department = relationship("Department", back_populates="ranking")

    __table_args__ = (
        Index("ix_dept_rankings_points", "total_points"),
    )


class PeriodSnapshot(Base):
    """Stores pre-computed ranking snapshots for weekly/monthly/yearly."""
    __tablename__ = "period_snapshots"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    period_type = Column(String(10), nullable=False)
    entity_type = Column(String(15), nullable=False)
    entity_id = Column(GUID(), nullable=False)
    period_start = Column(DateTime(timezone=True), nullable=False)
    period_end = Column(DateTime(timezone=True), nullable=False)
    points_earned = Column(Integer, nullable=False, default=0)
    rank = Column(Integer, nullable=True)
    metadata_json = Column(String(500), nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)

    __table_args__ = (
        UniqueConstraint("period_type", "entity_type", "entity_id", "period_start", name="uq_snapshot"),
        Index("ix_snapshot_period", "period_type", "period_start"),
        Index("ix_snapshot_entity", "entity_type", "entity_id"),
        CheckConstraint("period_type IN ('weekly', 'monthly', 'yearly')", name="chk_snapshot_period"),
        CheckConstraint("entity_type IN ('user', 'club', 'department')", name="chk_snapshot_entity"),
    )

from pydantic import BaseModel
from typing import Optional
from uuid import UUID
from datetime import datetime


class PointOut(BaseModel):
    id: UUID
    user_id: UUID
    activity_type: str
    points_value: int
    ref_type: Optional[str] = None
    ref_id: Optional[UUID] = None
    description: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class LeaderboardEntryOut(BaseModel):
    rank: int
    user_id: Optional[str] = None
    user_name: Optional[str] = None
    user_avatar: Optional[str] = None
    total_points: int
    streak_days: Optional[int] = None
    total_activities: Optional[int] = None
    last_active: Optional[str] = None


class MyRankingOut(BaseModel):
    overall_rank: int
    student_rank: int
    total_points: int
    all_time_points: int
    streak_days: int
    weekly_points: int
    monthly_points: int
    yearly_points: int
    recent_activity: list


class ClubRankingOut(BaseModel):
    rank: int
    club_id: str
    club_name: Optional[str] = None
    club_icon: Optional[str] = None
    total_points: int
    total_posts: Optional[int] = None
    active_members: Optional[int] = None
    member_count: Optional[int] = None


class DepartmentRankingOut(BaseModel):
    rank: int
    department_id: str
    department_name: Optional[str] = None
    department_code: Optional[str] = None
    total_points: int
    student_count: Optional[int] = None
    active_users: Optional[int] = None
    club_count: Optional[int] = None
    post_count: Optional[int] = None


class PeriodRankingOut(BaseModel):
    rank: int
    entity_id: str
    name: str
    icon: Optional[str] = None
    points_earned: int
    activity_count: int


class LeaderboardStatsOut(BaseModel):
    total_users: int
    total_points_awarded: int
    total_activities: int
    top_user: dict
    today: dict
    this_week: dict
    this_month: dict


class LeaderboardEntryUpdate(BaseModel):
    total_points: int

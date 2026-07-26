"""
Point Calculation Engine
========================
Central service that awards, reverses, and recalculates points
for Students, Clubs, and Departments.

Point Rules:
  post_created    → +10
  post_liked      → +2   (awarded to post author)
  post_unliked    → -2   (reversed from post author)
  comment_added   → +3
  event_created   → +20
  event_attended  → +20  (RSVP going)
  club_activity   → +30
  daily_login     → +5
  streak_bonus    → +10 per 7-day streak
  profile_completed → +15
"""

import logging
from datetime import datetime, timedelta, date
from uuid import UUID
from sqlalchemy import select, func, update, text, case
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.points import Point, Leaderboard, ClubRanking, DepartmentRanking
from app.models.user import User
from app.models.club import Club, ClubMember
from app.models.department import Department
from app.models.post import Post, Like
from app.models.comment import Comment
from app.models.event import Event, RSVP
from app.models.activity_log import ActivityLog

logger = logging.getLogger("magnet.points")

# ──────────────────────────────────────────────
#  Point value map
# ──────────────────────────────────────────────

POINT_VALUES = {
    "post_created":    10,
    "post_liked":       2,
    "post_unliked":    -2,
    "comment_added":    3,
    "event_created":   20,
    "event_attended":  20,
    "club_activity":   30,
    "daily_login":      5,
    "streak_bonus":    10,
    "profile_completed": 15,
    "penalty":        -10,
    "admin_adjustment":  0,
}


# ──────────────────────────────────────────────
#  Core: Award / Reverse points
# ──────────────────────────────────────────────

async def award_points(
    db: AsyncSession,
    user_id: UUID,
    activity_type: str,
    ref_type: str | None = None,
    ref_id: UUID | None = None,
    description: str | None = None,
    points_override: int | None = None,
) -> Point:
    """Create a Point record and update the user's Leaderboard entry."""

    pts = points_override if points_override is not None else POINT_VALUES.get(activity_type)
    if pts is None:
        raise ValueError(f"Unknown activity_type: {activity_type}")

    point = Point(
        user_id=user_id,
        activity_type=activity_type,
        points_value=pts,
        ref_type=ref_type,
        ref_id=ref_id,
        description=description,
    )
    db.add(point)
    await db.flush()

    await _upsert_leaderboard(db, user_id, pts)
    await _update_club_ranking_for_user(db, user_id, pts)
    await _update_department_ranking_for_user(db, user_id, pts)

    logger.debug(f"Awarded {pts} pts ({activity_type}) to user {user_id}")
    return point


async def reverse_points(
    db: AsyncSession,
    user_id: UUID,
    activity_type: str,
    ref_type: str | None = None,
    ref_id: UUID | None = None,
    description: str | None = None,
) -> Point | None:
    """Reverse points for an undo action (e.g. unlike). Uses the negative value."""

    pts = POINT_VALUES.get(activity_type)
    if pts is None or pts >= 0:
        return None

    point = Point(
        user_id=user_id,
        activity_type=activity_type,
        points_value=-abs(pts),
        ref_type=ref_type,
        ref_id=ref_id,
        description=description,
    )
    db.add(point)
    await db.flush()

    await _upsert_leaderboard(db, user_id, pts)
    await _update_club_ranking_for_user(db, user_id, pts)
    await _update_department_ranking_for_user(db, user_id, pts)

    logger.debug(f"Reversed {abs(pts)} pts ({activity_type}) from user {user_id}")
    return point


# ──────────────────────────────────────────────
#  Leaderboard: Upsert user ranking
# ──────────────────────────────────────────────

async def _upsert_leaderboard(db: AsyncSession, user_id: UUID, delta: int) -> None:
    result = await db.execute(select(Leaderboard).where(Leaderboard.user_id == user_id))
    entry = result.scalar_one_or_none()

    if entry:
        entry.total_points = max(0, entry.total_points + delta)
        entry.last_active = datetime.utcnow()
    else:
        entry = Leaderboard(
            user_id=user_id,
            total_points=max(0, delta),
            streak_days=0,
            last_active=datetime.utcnow(),
        )
        db.add(entry)

    await db.flush()


# ──────────────────────────────────────────────
#  Daily login + streak tracking
# ──────────────────────────────────────────────

async def record_daily_login(db: AsyncSession, user_id: UUID) -> dict:
    """Award daily login points and calculate streaks."""

    today = date.today()

    existing = await db.execute(
        select(Point)
        .where(Point.user_id == user_id, Point.activity_type == "daily_login")
        .order_by(Point.created_at.desc())
        .limit(1)
    )
    last_point = existing.scalar_one_or_none()

    if last_point and last_point.created_at.date() == today:
        return {"awarded": False, "reason": "already_login_today"}

    points = await award_points(
        db, user_id, "daily_login",
        description=f"Daily login on {today.isoformat()}",
    )

    lb_result = await db.execute(select(Leaderboard).where(Leaderboard.user_id == user_id))
    lb = lb_result.scalar_one_or_none()

    if lb:
        yesterday = today - timedelta(days=1)
        if last_point and last_point.created_at.date() == yesterday:
            lb.streak_days += 1
        elif not last_point or last_point.created_at.date() != today:
            lb.streak_days = 1

        if lb.streak_days > 0 and lb.streak_days % 7 == 0:
            await award_points(
                db, user_id, "streak_bonus",
                description=f"Streak bonus: {lb.streak_days} days",
            )
            return {"awarded": True, "streak_days": lb.streak_days, "bonus": True}

        await db.flush()
        return {"awarded": True, "streak_days": lb.streak_days, "bonus": False}

    return {"awarded": True, "streak_days": 1, "bonus": False}


# ──────────────────────────────────────────────
#  Club Ranking updates
# ──────────────────────────────────────────────

async def _update_club_ranking_for_user(db: AsyncSession, user_id: UUID, delta: int) -> None:
    memberships = await db.execute(
        select(ClubMember.club_id).where(ClubMember.user_id == user_id)
    )
    club_ids = [row[0] for row in memberships.all()]

    for cid in club_ids:
        result = await db.execute(select(ClubRanking).where(ClubRanking.club_id == cid))
        ranking = result.scalar_one_or_none()

        if ranking:
            ranking.total_points = max(0, ranking.total_points + delta)
        else:
            ranking = ClubRanking(club_id=cid, total_points=max(0, delta))
            db.add(ranking)

    if club_ids:
        await db.flush()


async def recalculate_club_rankings(db: AsyncSession) -> None:
    """Full recalculation of all club rankings from scratch."""

    result = await db.execute(select(Club).where(Club.is_active == True))
    clubs = result.scalars().all()

    rankings = []
    for club in clubs:
        member_count_result = await db.execute(
            select(func.count()).select_from(ClubMember).where(ClubMember.club_id == club.id)
        )
        member_count = member_count_result.scalar()

        posts_result = await db.execute(
            select(func.count()).select_from(Post).where(Post.club_id == club.id)
        )
        post_count = posts_result.scalar()

        events_result = await db.execute(
            select(func.coalesce(func.sum(Point.points_value), 0))
            .join(User, Point.user_id == User.id)
            .join(ClubMember, ClubMember.user_id == User.id)
            .where(ClubMember.club_id == club.id)
        )
        total_points = events_result.scalar() or 0

        clubs_result = await db.execute(
            select(func.count()).select_from(Club).where(
                Club.department_id == club.department_id, Club.is_active == True
            )
        )
        active_members_result = await db.execute(
            select(func.count())
            .select_from(Point)
            .join(User, Point.user_id == User.id)
            .join(ClubMember, ClubMember.user_id == User.id)
            .where(
                ClubMember.club_id == club.id,
                Point.created_at >= datetime.utcnow() - timedelta(days=30),
            )
        )

        ranking_result = await db.execute(
            select(ClubRanking).where(ClubRanking.club_id == club.id)
        )
        ranking = ranking_result.scalar_one_or_none()

        if ranking:
            ranking.total_points = total_points
            ranking.total_posts = post_count
            ranking.total_events = member_count
            ranking.total_members_active = active_members_result.scalar() or 0
        else:
            ranking = ClubRanking(
                club_id=club.id,
                total_points=total_points,
                total_posts=post_count,
                total_events=member_count,
                total_members_active=active_members_result.scalar() or 0,
            )
            db.add(ranking)

        rankings.append((club.id, total_points))

    await db.flush()

    rankings.sort(key=lambda x: x[1], reverse=True)
    for i, (cid, _) in enumerate(rankings, 1):
        r = await db.execute(select(ClubRanking).where(ClubRanking.club_id == cid))
        club_r = r.scalar_one_or_none()
        if club_r:
            club_r.rank = i
    await db.flush()


# ──────────────────────────────────────────────
#  Department Ranking updates
# ──────────────────────────────────────────────

async def _update_department_ranking_for_user(db: AsyncSession, user_id: UUID, delta: int) -> None:
    user_result = await db.execute(select(User.department_id).where(User.id == user_id))
    dept_id = user_result.scalar_one()

    if not dept_id:
        return

    result = await db.execute(select(DepartmentRanking).where(DepartmentRanking.department_id == dept_id))
    ranking = result.scalar_one_or_none()

    if ranking:
        ranking.total_points = max(0, ranking.total_points + delta)
    else:
        ranking = DepartmentRanking(department_id=dept_id, total_points=max(0, delta))
        db.add(ranking)

    await db.flush()


async def recalculate_department_rankings(db: AsyncSession) -> None:
    """Full recalculation of all department rankings from scratch."""

    result = await db.execute(select(Department).where(Department.is_active == True))
    departments = result.scalars().all()

    rankings = []
    for dept in departments:
        students_result = await db.execute(
            select(func.count()).select_from(User)
            .where(User.department_id == dept.id, User.role == "student", User.is_active == True)
        )
        student_count = students_result.scalar()

        posts_result = await db.execute(
            select(func.count()).select_from(Post)
            .join(User, Post.author_id == User.id)
            .where(User.department_id == dept.id)
        )
        post_count = posts_result.scalar()

        clubs_result = await db.execute(
            select(func.count()).select_from(Club)
            .where(Club.department_id == dept.id, Club.is_active == True)
        )
        club_count = clubs_result.scalar()

        points_result = await db.execute(
            select(func.coalesce(func.sum(Point.points_value), 0))
            .join(User, Point.user_id == User.id)
            .where(User.department_id == dept.id)
        )
        total_points = points_result.scalar() or 0

        ranking_result = await db.execute(
            select(DepartmentRanking).where(DepartmentRanking.department_id == dept.id)
        )
        ranking = ranking_result.scalar_one_or_none()

        if ranking:
            ranking.total_points = total_points
            ranking.total_students = student_count
            ranking.total_posts = post_count
            ranking.total_clubs = club_count
        else:
            ranking = DepartmentRanking(
                department_id=dept.id,
                total_points=total_points,
                total_students=student_count,
                total_posts=post_count,
                total_clubs=club_count,
            )
            db.add(ranking)

        rankings.append((dept.id, total_points))

    await db.flush()

    rankings.sort(key=lambda x: x[1], reverse=True)
    for i, (did, _) in enumerate(rankings, 1):
        r = await db.execute(select(DepartmentRanking).where(DepartmentRanking.department_id == did))
        dept_r = r.scalar_one_or_none()
        if dept_r:
            dept_r.rank = i
    await db.flush()


# ──────────────────────────────────────────────
#  Recalculate user leaderboard
# ──────────────────────────────────────────────

async def recalculate_leaderboard(db: AsyncSession) -> None:
    """Full recalculation of the user leaderboard from Point records."""

    result = await db.execute(
        select(
            Point.user_id,
            func.coalesce(func.sum(Point.points_value), 0).label("total"),
        )
        .group_by(Point.user_id)
    )
    user_points = {row.user_id: row.total for row in result.all()}

    for uid, total in user_points.items():
        lb_result = await db.execute(select(Leaderboard).where(Leaderboard.user_id == uid))
        lb = lb_result.scalar_one_or_none()

        if lb:
            lb.total_points = total
        else:
            lb = Leaderboard(user_id=uid, total_points=total, streak_days=0)
            db.add(lb)

    await db.flush()

    all_lb = await db.execute(
        select(Leaderboard).order_by(Leaderboard.total_points.desc())
    )
    for i, entry in enumerate(all_lb.scalars().all(), 1):
        entry.rank = i
    await db.flush()


# ──────────────────────────────────────────────
#  Summary: Award points for specific actions
# ──────────────────────────────────────────────

async def on_post_created(db: AsyncSession, user_id: UUID, post_id: UUID) -> Point:
    return await award_points(
        db, user_id, "post_created",
        ref_type="post", ref_id=post_id,
        description="Created a post",
    )


async def on_post_liked(db: AsyncSession, liker_id: UUID, post_author_id: UUID, post_id: UUID) -> Point | None:
    if liker_id == post_author_id:
        return None
    return await award_points(
        db, post_author_id, "post_liked",
        ref_type="post", ref_id=post_id,
        description="Your post received a like",
    )


async def on_post_unliked(db: AsyncSession, liker_id: UUID, post_author_id: UUID, post_id: UUID) -> Point | None:
    if liker_id == post_author_id:
        return None
    return await reverse_points(
        db, post_author_id, "post_unliked",
        ref_type="post", ref_id=post_id,
        description="Like removed from your post",
    )


async def on_comment_added(db: AsyncSession, user_id: UUID, post_id: UUID, comment_id: UUID) -> Point:
    return await award_points(
        db, user_id, "comment_added",
        ref_type="comment", ref_id=comment_id,
        description="Added a comment",
    )


async def on_event_created(db: AsyncSession, user_id: UUID, event_id: UUID) -> Point:
    return await award_points(
        db, user_id, "event_created",
        ref_type="event", ref_id=event_id,
        description="Created an event",
    )


async def on_event_attended(db: AsyncSession, user_id: UUID, event_id: UUID) -> Point:
    return await award_points(
        db, user_id, "event_attended",
        ref_type="event", ref_id=event_id,
        description="RSVP'd to an event",
    )


async def on_club_activity(db: AsyncSession, user_id: UUID, club_id: UUID, description: str = "Club activity") -> Point:
    return await award_points(
        db, user_id, "club_activity",
        ref_type="club", ref_id=club_id,
        description=description,
    )


async def on_profile_completed(db: AsyncSession, user_id: UUID) -> Point:
    return await award_points(
        db, user_id, "profile_completed",
        description="Completed profile setup",
    )

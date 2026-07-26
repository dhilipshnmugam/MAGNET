"""
Optimized Leaderboard Engine
=============================
PostgreSQL-native queries using CTEs, window functions, and aggregations.
All ranking calculations are done in a single DB roundtrip.
"""

import logging
from datetime import datetime, timedelta, date
from uuid import UUID
from sqlalchemy import select, func, text, case, and_, or_, literal_column
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.points import Point, Leaderboard, ClubRanking, DepartmentRanking, PeriodSnapshot
from app.models.user import User
from app.models.club import Club, ClubMember
from app.models.department import Department
from app.models.post import Post

logger = logging.getLogger("magnet.leaderboard")


# ──────────────────────────────────────────────
#  Period helpers
# ──────────────────────────────────────────────

def _get_week_bounds(dt: date | None = None) -> tuple[datetime, datetime]:
    d = dt or date.today()
    start = datetime.combine(d - timedelta(days=d.weekday()), datetime.min.time())
    end = datetime.combine(d + timedelta(days=6 - d.weekday()), datetime.max.time())
    return start, end


def _get_month_bounds(dt: date | None = None) -> tuple[datetime, datetime]:
    d = dt or date.today()
    start = datetime(d.year, d.month, 1)
    if d.month == 12:
        end = datetime(d.year + 1, 1, 1) - timedelta(seconds=1)
    else:
        end = datetime(d.year, d.month + 1, 1) - timedelta(seconds=1)
    return start, end


def _get_year_bounds(dt: date | None = None) -> tuple[datetime, datetime]:
    d = dt or date.today()
    start = datetime(d.year, 1, 1)
    end = datetime(d.year, 12, 31, 23, 59, 59)
    return start, end


PERIOD_GETTERS = {
    "weekly": _get_week_bounds,
    "monthly": _get_month_bounds,
    "yearly": _get_year_bounds,
}


# ══════════════════════════════════════════════
#  1. TOP STUDENTS (Optimized single-query)
# ══════════════════════════════════════════════

async def top_students(
    db: AsyncSession,
    limit: int = 10,
    department_id: UUID | None = None,
) -> list[dict]:
    """
    Single CTE query: aggregates points, joins user data, applies RANK() window function.
    Returns top N students in one roundtrip.
    """
    points_cte = (
        select(
            Point.user_id,
            func.coalesce(func.sum(Point.points_value), 0).label("total_points"),
            func.count(Point.id).label("total_activities"),
            func.max(Point.created_at).label("last_active"),
        )
        .group_by(Point.user_id)
        .cte(name="user_points")
    )

    query = (
        select(
            points_cte.c.user_id,
            User.full_name,
            User.avatar_url,
            User.department_id,
            points_cte.c.total_points,
            points_cte.c.total_activities,
            points_cte.c.last_active,
            func.rank().over(order_by=points_cte.c.total_points.desc()).label("rank"),
        )
        .join(User, points_cte.c.user_id == User.id)
        .where(User.is_active == True, User.role == "student")
    )

    if department_id:
        query = query.where(User.department_id == department_id)

    query = (
        query
        .order_by(points_cte.c.total_points.desc())
        .limit(limit)
    )

    result = await db.execute(query)
    rows = result.all()

    return [
        {
            "rank": row.rank,
            "user_id": str(row.user_id),
            "user_name": row.full_name,
            "user_avatar": row.avatar_url,
            "total_points": row.total_points,
            "total_activities": row.total_activities,
            "last_active": row.last_active.isoformat() if row.last_active else None,
        }
        for row in rows
    ]


# ══════════════════════════════════════════════
#  2. TOP CLUBS (Optimized single-query)
# ══════════════════════════════════════════════

async def top_clubs(
    db: AsyncSession,
    limit: int = 10,
    department_id: UUID | None = None,
) -> list[dict]:
    """
    CTE: aggregates member points, joins club data, applies RANK().
    """
    club_points_cte = (
        select(
            ClubMember.club_id,
            func.coalesce(func.sum(Point.points_value), 0).label("total_points"),
            func.count(func.distinct(Point.user_id)).label("active_members"),
            func.count(Point.id).label("total_activities"),
        )
        .join(Point, Point.user_id == ClubMember.user_id)
        .group_by(ClubMember.club_id)
        .cte(name="club_points")
    )

    member_count_cte = (
        select(
            ClubMember.club_id,
            func.count().label("member_count"),
        )
        .group_by(ClubMember.club_id)
        .cte(name="club_members")
    )

    post_count_cte = (
        select(
            Post.club_id,
            func.count().label("post_count"),
        )
        .where(Post.club_id.isnot(None))
        .group_by(Post.club_id)
        .cte(name="club_posts")
    )

    query = (
        select(
            Club.id.label("club_id"),
            Club.name.label("club_name"),
            Club.icon_url,
            func.coalesce(club_points_cte.c.total_points, 0).label("total_points"),
            func.coalesce(club_points_cte.c.active_members, 0).label("active_members"),
            func.coalesce(member_count_cte.c.member_count, 0).label("member_count"),
            func.coalesce(post_count_cte.c.post_count, 0).label("post_count"),
            func.rank().over(order_by=func.coalesce(club_points_cte.c.total_points, 0).desc()).label("rank"),
        )
        .outerjoin(club_points_cte, Club.id == club_points_cte.c.club_id)
        .outerjoin(member_count_cte, Club.id == member_count_cte.c.club_id)
        .outerjoin(post_count_cte, Club.id == post_count_cte.c.club_id)
        .where(Club.is_active == True)
    )

    if department_id:
        query = query.where(Club.department_id == department_id)

    query = (
        query
        .order_by(func.coalesce(club_points_cte.c.total_points, 0).desc())
        .limit(limit)
    )

    result = await db.execute(query)
    rows = result.all()

    return [
        {
            "rank": row.rank,
            "club_id": str(row.club_id),
            "club_name": row.club_name,
            "club_icon": row.icon_url,
            "total_points": row.total_points,
            "active_members": row.active_members,
            "member_count": row.member_count,
            "post_count": row.post_count,
        }
        for row in rows
    ]


# ══════════════════════════════════════════════
#  3. TOP DEPARTMENTS (Optimized single-query)
# ══════════════════════════════════════════════

async def top_departments(db: AsyncSession, limit: int = 10) -> list[dict]:
    """
    CTE: aggregates all user points per department, joins dept data, applies RANK().
    """
    dept_points_cte = (
        select(
            User.department_id,
            func.coalesce(func.sum(Point.points_value), 0).label("total_points"),
            func.count(func.distinct(Point.user_id)).label("active_users"),
            func.count(Point.id).label("total_activities"),
        )
        .join(Point, Point.user_id == User.id)
        .where(User.department_id.isnot(None))
        .group_by(User.department_id)
        .cte(name="dept_points")
    )

    student_count_cte = (
        select(
            User.department_id,
            func.count().label("student_count"),
        )
        .where(User.role == "student", User.is_active == True)
        .group_by(User.department_id)
        .cte(name="dept_students")
    )

    club_count_cte = (
        select(
            Club.department_id,
            func.count().label("club_count"),
        )
        .where(Club.is_active == True)
        .group_by(Club.department_id)
        .cte(name="dept_clubs")
    )

    post_count_cte = (
        select(
            User.department_id,
            func.count(Post.id).label("post_count"),
        )
        .join(Post, Post.author_id == User.id)
        .where(User.department_id.isnot(None))
        .group_by(User.department_id)
        .cte(name="dept_posts")
    )

    query = (
        select(
            Department.id.label("dept_id"),
            Department.name.label("dept_name"),
            Department.code.label("dept_code"),
            func.coalesce(dept_points_cte.c.total_points, 0).label("total_points"),
            func.coalesce(student_count_cte.c.student_count, 0).label("student_count"),
            func.coalesce(club_count_cte.c.club_count, 0).label("club_count"),
            func.coalesce(post_count_cte.c.post_count, 0).label("post_count"),
            func.coalesce(dept_points_cte.c.active_users, 0).label("active_users"),
            func.rank().over(order_by=func.coalesce(dept_points_cte.c.total_points, 0).desc()).label("rank"),
        )
        .outerjoin(dept_points_cte, Department.id == dept_points_cte.c.department_id)
        .outerjoin(student_count_cte, Department.id == student_count_cte.c.department_id)
        .outerjoin(club_count_cte, Department.id == club_count_cte.c.department_id)
        .outerjoin(post_count_cte, Department.id == post_count_cte.c.department_id)
        .where(Department.is_active == True)
        .order_by(func.coalesce(dept_points_cte.c.total_points, 0).desc())
        .limit(limit)
    )

    result = await db.execute(query)
    rows = result.all()

    return [
        {
            "rank": row.rank,
            "department_id": str(row.dept_id),
            "department_name": row.dept_name,
            "department_code": row.dept_code,
            "total_points": row.total_points,
            "student_count": row.student_count,
            "active_users": row.active_users,
            "club_count": row.club_count,
            "post_count": row.post_count,
        }
        for row in rows
    ]


# ══════════════════════════════════════════════
#  4. TIME-BASED RANKINGS (Weekly / Monthly / Yearly)
# ══════════════════════════════════════════════

async def _period_ranking(
    db: AsyncSession,
    period_type: str,
    entity_type: str,
    start: datetime,
    end: datetime,
    limit: int = 10,
    department_id: UUID | None = None,
) -> list[dict]:
    """
    Generic period-based ranking using a filtered aggregation + RANK() window.
    Works for users, clubs, or departments.
    """

    if entity_type == "user":
        points_cte = (
            select(
                Point.user_id.label("entity_id"),
                func.coalesce(func.sum(Point.points_value), 0).label("points_earned"),
                func.count(Point.id).label("activity_count"),
            )
            .where(Point.created_at.between(start, end))
            .group_by(Point.user_id)
            .cte(name="period_points")
        )

        query = (
            select(
                points_cte.c.entity_id,
                User.full_name.label("name"),
                User.avatar_url.label("icon"),
                points_cte.c.points_earned,
                points_cte.c.activity_count,
                func.rank().over(order_by=points_cte.c.points_earned.desc()).label("rank"),
            )
            .join(User, points_cte.c.entity_id == User.id)
            .where(User.is_active == True, User.role == "student")
        )
        if department_id:
            query = query.where(User.department_id == department_id)

        query = query.order_by(points_cte.c.points_earned.desc()).limit(limit)

        result = await db.execute(query)
        rows = result.all()

        return [
            {
                "rank": row.rank,
                "entity_id": str(row.entity_id),
                "name": row.name,
                "icon": row.icon,
                "points_earned": row.points_earned,
                "activity_count": row.activity_count,
            }
            for row in rows
        ]

    elif entity_type == "club":
        points_cte = (
            select(
                ClubMember.club_id.label("entity_id"),
                func.coalesce(func.sum(Point.points_value), 0).label("points_earned"),
                func.count(Point.id).label("activity_count"),
            )
            .join(Point, Point.user_id == ClubMember.user_id)
            .where(Point.created_at.between(start, end))
            .group_by(ClubMember.club_id)
            .cte(name="period_club_points")
        )

        query = (
            select(
                points_cte.c.entity_id,
                Club.name.label("name"),
                Club.icon_url.label("icon"),
                points_cte.c.points_earned,
                points_cte.c.activity_count,
                func.rank().over(order_by=points_cte.c.points_earned.desc()).label("rank"),
            )
            .join(Club, points_cte.c.entity_id == Club.id)
            .where(Club.is_active == True)
        )
        if department_id:
            query = query.where(Club.department_id == department_id)

        query = query.order_by(points_cte.c.points_earned.desc()).limit(limit)

        result = await db.execute(query)
        rows = result.all()

        return [
            {
                "rank": row.rank,
                "entity_id": str(row.entity_id),
                "name": row.name,
                "icon": row.icon,
                "points_earned": row.points_earned,
                "activity_count": row.activity_count,
            }
            for row in rows
        ]

    elif entity_type == "department":
        points_cte = (
            select(
                User.department_id.label("entity_id"),
                func.coalesce(func.sum(Point.points_value), 0).label("points_earned"),
                func.count(Point.id).label("activity_count"),
            )
            .join(Point, Point.user_id == User.id)
            .where(
                Point.created_at.between(start, end),
                User.department_id.isnot(None),
            )
            .group_by(User.department_id)
            .cte(name="period_dept_points")
        )

        query = (
            select(
                points_cte.c.entity_id,
                Department.name.label("name"),
                Department.code.label("icon"),
                points_cte.c.points_earned,
                points_cte.c.activity_count,
                func.rank().over(order_by=points_cte.c.points_earned.desc()).label("rank"),
            )
            .join(Department, points_cte.c.entity_id == Department.id)
            .where(Department.is_active == True)
            .order_by(points_cte.c.points_earned.desc())
            .limit(limit)
        )

        result = await db.execute(query)
        rows = result.all()

        return [
            {
                "rank": row.rank,
                "entity_id": str(row.entity_id),
                "name": row.name,
                "icon": row.icon,
                "points_earned": row.points_earned,
                "activity_count": row.activity_count,
            }
            for row in rows
        ]

    return []


async def weekly_ranking(
    db: AsyncSession,
    entity_type: str = "user",
    limit: int = 10,
    department_id: UUID | None = None,
) -> list[dict]:
    start, end = _get_week_bounds()
    return await _period_ranking(db, "weekly", entity_type, start, end, limit, department_id)


async def monthly_ranking(
    db: AsyncSession,
    entity_type: str = "user",
    limit: int = 10,
    department_id: UUID | None = None,
) -> list[dict]:
    start, end = _get_month_bounds()
    return await _period_ranking(db, "monthly", entity_type, start, end, limit, department_id)


async def yearly_ranking(
    db: AsyncSession,
    entity_type: str = "user",
    limit: int = 10,
    department_id: UUID | None = None,
) -> list[dict]:
    start, end = _get_year_bounds()
    return await _period_ranking(db, "yearly", entity_type, start, end, limit, department_id)


# ══════════════════════════════════════════════
#  5. OVERALL RANKING (all-time from leaderboard table)
# ══════════════════════════════════════════════

async def overall_ranking(
    db: AsyncSession,
    entity_type: str = "user",
    limit: int = 10,
    department_id: UUID | None = None,
) -> list[dict]:
    """Reads from pre-computed leaderboard/club_rankings/department_rankings tables."""

    if entity_type == "user":
        query = (
            select(
                Leaderboard.user_id,
                User.full_name,
                User.avatar_url,
                Leaderboard.total_points,
                Leaderboard.rank,
                Leaderboard.streak_days,
                func.rank().over(order_by=Leaderboard.total_points.desc()).label("computed_rank"),
            )
            .join(User, Leaderboard.user_id == User.id)
            .where(User.is_active == True, User.role == "student")
        )
        if department_id:
            query = query.where(User.department_id == department_id)

        query = query.order_by(Leaderboard.total_points.desc()).limit(limit)
        result = await db.execute(query)
        rows = result.all()

        return [
            {
                "rank": row.computed_rank or row.rank,
                "user_id": str(row.user_id),
                "user_name": row.full_name,
                "user_avatar": row.avatar_url,
                "total_points": row.total_points,
                "streak_days": row.streak_days,
            }
            for row in rows
        ]

    elif entity_type == "club":
        query = (
            select(
                ClubRanking.club_id,
                Club.name,
                Club.icon_url,
                ClubRanking.total_points,
                ClubRanking.total_posts,
                ClubRanking.total_members_active,
                func.rank().over(order_by=ClubRanking.total_points.desc()).label("computed_rank"),
            )
            .join(Club, ClubRanking.club_id == Club.id)
            .where(Club.is_active == True)
        )
        if department_id:
            query = query.where(Club.department_id == department_id)

        query = query.order_by(ClubRanking.total_points.desc()).limit(limit)
        result = await db.execute(query)
        rows = result.all()

        return [
            {
                "rank": row.computed_rank,
                "club_id": str(row.club_id),
                "club_name": row.name,
                "club_icon": row.icon_url,
                "total_points": row.total_points,
                "total_posts": row.total_posts,
                "active_members": row.total_members_active,
            }
            for row in rows
        ]

    elif entity_type == "department":
        query = (
            select(
                DepartmentRanking.department_id,
                Department.name,
                Department.code,
                DepartmentRanking.total_points,
                DepartmentRanking.total_students,
                DepartmentRanking.total_clubs,
                DepartmentRanking.total_posts,
                func.rank().over(order_by=DepartmentRanking.total_points.desc()).label("computed_rank"),
            )
            .join(Department, DepartmentRanking.department_id == Department.id)
            .where(Department.is_active == True)
            .order_by(DepartmentRanking.total_points.desc())
            .limit(limit)
        )
        result = await db.execute(query)
        rows = result.all()

        return [
            {
                "rank": row.computed_rank,
                "department_id": str(row.department_id),
                "department_name": row.name,
                "department_code": row.code,
                "total_points": row.total_points,
                "student_count": row.total_students,
                "club_count": row.total_clubs,
                "post_count": row.total_posts,
            }
            for row in rows
        ]

    return []


# ══════════════════════════════════════════════
#  6. MY RANKING (optimized: 2 queries)
# ══════════════════════════════════════════════

async def my_ranking(db: AsyncSession, user_id: UUID) -> dict:
    """Returns current user's rank across all periods + recent activity."""

    lb = await db.execute(select(Leaderboard).where(Leaderboard.user_id == user_id))
    lb_entry = lb.scalar_one_or_none()

    points_result = await db.execute(
        select(
            func.coalesce(func.sum(Point.points_value), 0).label("all_time"),
        ).where(Point.user_id == user_id)
    )
    all_time = points_result.scalar()

    now = datetime.utcnow()
    week_start, _ = _get_week_bounds()
    month_start, _ = _get_month_bounds()
    year_start, _ = _get_year_bounds()

    period_q = text("""
        SELECT
            SUM(CASE WHEN created_at >= :week_start THEN points_value ELSE 0 END) AS week_pts,
            SUM(CASE WHEN created_at >= :month_start THEN points_value ELSE 0 END) AS month_pts,
            SUM(CASE WHEN created_at >= :year_start THEN points_value ELSE 0 END) AS year_pts
        FROM points
        WHERE user_id = :uid
    """)
    period_result = await db.execute(period_q, {"uid": user_id, "week_start": week_start, "month_start": month_start, "year_start": year_start})
    periods = period_result.one()

    rank_q = text("""
        WITH user_points AS (
            SELECT user_id, SUM(points_value) AS total
            FROM points
            GROUP BY user_id
        )
        SELECT
            (SELECT COUNT(*) + 1 FROM user_points WHERE total > (
                SELECT total FROM user_points WHERE user_id = :uid
            )) AS overall_rank,
            (SELECT COUNT(*) + 1 FROM user_points up
             JOIN users u ON up.user_id = u.id
             WHERE up.total > (
                 SELECT total FROM user_points WHERE user_id = :uid
             ) AND u.role = 'student') AS student_rank
    """)
    rank_result = await db.execute(rank_q, {"uid": user_id})
    rank_row = rank_result.one()

    recent_q = (
        select(Point.activity_type, Point.points_value, Point.description, Point.created_at)
        .where(Point.user_id == user_id)
        .order_by(Point.created_at.desc())
        .limit(10)
    )
    recent_result = await db.execute(recent_q)
    recent = [
        {
            "activity_type": r.activity_type,
            "points_value": r.points_value,
            "description": r.description,
            "created_at": r.created_at.isoformat(),
        }
        for r in recent_result.all()
    ]

    return {
        "overall_rank": rank_row.overall_rank,
        "student_rank": rank_row.student_rank,
        "total_points": lb_entry.total_points if lb_entry else all_time,
        "all_time_points": all_time,
        "streak_days": lb_entry.streak_days if lb_entry else 0,
        "weekly_points": periods.week_pts or 0,
        "monthly_points": periods.month_pts or 0,
        "yearly_points": periods.year_pts or 0,
        "recent_activity": recent,
    }


# ══════════════════════════════════════════════
#  7. SNAPSHOTS (periodic pre-computation)
# ══════════════════════════════════════════════

async def compute_snapshots(db: AsyncSession, period_type: str) -> int:
    """
    Compute and store period snapshots for users, clubs, and departments.
    Returns the number of snapshots created.
    """
    getter = PERIOD_GETTERS.get(period_type)
    if not getter:
        raise ValueError(f"Invalid period_type: {period_type}")

    start, end = getter()
    count = 0

    for entity_type in ("user", "club", "department"):
        if entity_type == "user":
            data = await weekly_ranking(db, "user", 1000)
            for item in data:
                snap = PeriodSnapshot(
                    period_type=period_type,
                    entity_type="user",
                    entity_id=UUID(item["entity_id"]),
                    period_start=start,
                    period_end=end,
                    points_earned=item["points_earned"],
                    rank=item["rank"],
                )
                db.add(snap)
                count += 1

        elif entity_type == "club":
            data = await weekly_ranking(db, "club", 1000)
            for item in data:
                snap = PeriodSnapshot(
                    period_type=period_type,
                    entity_type="club",
                    entity_id=UUID(item["entity_id"]),
                    period_start=start,
                    period_end=end,
                    points_earned=item["points_earned"],
                    rank=item["rank"],
                )
                db.add(snap)
                count += 1

        elif entity_type == "department":
            data = await weekly_ranking(db, "department", 1000)
            for item in data:
                snap = PeriodSnapshot(
                    period_type=period_type,
                    entity_type="department",
                    entity_id=UUID(item["entity_id"]),
                    period_start=start,
                    period_end=end,
                    points_earned=item["points_earned"],
                    rank=item["rank"],
                )
                db.add(snap)
                count += 1

    await db.flush()
    logger.info(f"Computed {count} {period_type} snapshots")
    return count


# ══════════════════════════════════════════════
#  8. STATS DASHBOARD
# ══════════════════════════════════════════════

async def leaderboard_stats(db: AsyncSession) -> dict:
    """Returns platform-wide leaderboard statistics."""

    stats_q = text("""
        WITH stats AS (
            SELECT
                COUNT(DISTINCT p.user_id) AS active_users,
                SUM(p.points_value) AS total_points,
                COUNT(p.id) AS total_activities,
                COUNT(DISTINCT p.activity_type) AS unique_activity_types
            FROM points p
        ),
        top_user AS (
            SELECT user_id, total_points
            FROM leaderboard
            ORDER BY total_points DESC LIMIT 1
        ),
        today_stats AS (
            SELECT
                COUNT(DISTINCT user_id) AS today_active_users,
                COALESCE(SUM(points_value), 0) AS today_points
            FROM points
            WHERE created_at >= CURRENT_DATE
        ),
        week_stats AS (
            SELECT
                COUNT(DISTINCT user_id) AS week_active_users,
                COALESCE(SUM(points_value), 0) AS week_points
            FROM points
            WHERE created_at >= DATE_TRUNC('week', CURRENT_DATE)
        ),
        month_stats AS (
            SELECT
                COUNT(DISTINCT user_id) AS month_active_users,
                COALESCE(SUM(points_value), 0) AS month_points
            FROM points
            WHERE created_at >= DATE_TRUNC('month', CURRENT_DATE)
        )
        SELECT
            s.active_users,
            s.total_points,
            s.total_activities,
            u.user_id AS top_user_id,
            u.total_points AS top_user_points,
            t.today_active_users,
            t.today_points,
            w.week_active_users,
            w.week_points,
            m.month_active_users,
            m.month_points
        FROM stats s
        CROSS JOIN top_user u
        CROSS JOIN today_stats t
        CROSS JOIN week_stats w
        CROSS JOIN month_stats m
    """)

    result = await db.execute(stats_q)
    row = result.one()

    top_user_name = None
    if row.top_user_id:
        name_q = await db.execute(select(User.full_name).where(User.id == row.top_user_id))
        top_user_name = name_q.scalar_one_or_none()

    return {
        "total_users": row.active_users or 0,
        "total_points_awarded": row.total_points or 0,
        "total_activities": row.total_activities or 0,
        "top_user": {
            "user_id": str(row.top_user_id) if row.top_user_id else None,
            "user_name": top_user_name,
            "total_points": row.top_user_points or 0,
        },
        "today": {
            "active_users": row.today_active_users or 0,
            "points_earned": row.today_points or 0,
        },
        "this_week": {
            "active_users": row.week_active_users or 0,
            "points_earned": row.week_points or 0,
        },
        "this_month": {
            "active_users": row.month_active_users or 0,
            "points_earned": row.month_points or 0,
        },
    }

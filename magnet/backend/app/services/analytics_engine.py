"""
Analytics Engine
================
PostgreSQL-optimized queries for all dashboard analytics.
Each function runs a single DB roundtrip.
"""

import logging
from datetime import datetime, timedelta, date
from uuid import UUID
from sqlalchemy import select, func, text, case, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User, Student, Hod
from app.models.post import Post
from app.models.event import Event, RSVP
from app.models.club import Club, ClubMember
from app.models.channel import Channel, ChannelMember
from app.models.department import Department
from app.models.points import Point, Leaderboard
from app.models.activity_log import ActivityLog

logger = logging.getLogger("magnet.analytics")


# ══════════════════════════════════════════════
#  1. STUDENT GROWTH (monthly signups)
# ══════════════════════════════════════════════

async def student_growth(db: AsyncSession, months: int = 12) -> list[dict]:
    """Monthly student registration counts for the last N months."""
    q = text(f"""
        SELECT
            TO_CHAR(DATE_TRUNC('month', created_at), 'YYYY-MM') AS month,
            COUNT(*) AS count
        FROM users
        WHERE role = 'student'
          AND created_at >= DATE_TRUNC('month', NOW()) - INTERVAL '{months} months'
        GROUP BY DATE_TRUNC('month', created_at)
        ORDER BY DATE_TRUNC('month', created_at) ASC
    """)
    result = await db.execute(q)
    rows = result.all()
    return [{"month": r.month, "count": r.count} for r in rows]


# ══════════════════════════════════════════════
#  2. DEPARTMENT PERFORMANCE
# ══════════════════════════════════════════════

async def department_performance(db: AsyncSession) -> list[dict]:
    """Each department's students, posts, events, points, clubs."""
    q = text("""
        WITH dept_stats AS (
            SELECT
                d.id AS dept_id,
                d.name AS dept_name,
                d.code AS dept_code,
                COUNT(DISTINCT CASE WHEN u.role = 'student' THEN u.id END) AS student_count,
                COUNT(DISTINCT p.id) AS post_count,
                COUNT(DISTINCT e.id) AS event_count,
                COUNT(DISTINCT c.id) AS club_count,
                COALESCE(SUM(pt.points_value), 0) AS total_points
            FROM departments d
            LEFT JOIN users u ON u.department_id = d.id AND u.is_active = true
            LEFT JOIN posts p ON p.author_id = u.id
            LEFT JOIN events e ON e.creator_id = u.id
            LEFT JOIN clubs c ON c.department_id = d.id AND c.is_active = true
            LEFT JOIN points pt ON pt.user_id = u.id
            WHERE d.is_active = true
            GROUP BY d.id, d.name, d.code
        )
        SELECT *, RANK() OVER (ORDER BY total_points DESC) AS rank
        FROM dept_stats
        ORDER BY total_points DESC
    """)
    result = await db.execute(q)
    rows = result.all()
    return [
        {
            "department_id": str(r.dept_id),
            "department_name": r.dept_name,
            "department_code": r.dept_code,
            "student_count": r.student_count,
            "post_count": r.post_count,
            "event_count": r.event_count,
            "club_count": r.club_count,
            "total_points": r.total_points,
            "rank": r.rank,
        }
        for r in rows
    ]


# ══════════════════════════════════════════════
#  3. CLUB PERFORMANCE
# ══════════════════════════════════════════════

async def club_performance(db: AsyncSession, department_id: UUID | None = None) -> list[dict]:
    """Each club's members, posts, points."""
    params = {}
    dept_filter = ""
    if department_id:
        dept_filter = "AND cl.department_id = :dept_id"
        params["dept_id"] = department_id

    q = text(f"""
        WITH club_stats AS (
            SELECT
                cl.id AS club_id,
                cl.name AS club_name,
                COUNT(DISTINCT cm.user_id) AS member_count,
                COUNT(DISTINCT p.id) AS post_count,
                COUNT(DISTINCT pt.user_id) AS active_members,
                COALESCE(SUM(pt.points_value), 0) AS total_points
            FROM clubs cl
            LEFT JOIN club_members cm ON cm.club_id = cl.id
            LEFT JOIN users u ON cm.user_id = u.id
            LEFT JOIN posts p ON p.club_id = cl.id
            LEFT JOIN points pt ON pt.user_id = u.id
            WHERE cl.is_active = true {dept_filter}
            GROUP BY cl.id, cl.name
        )
        SELECT *, RANK() OVER (ORDER BY total_points DESC) AS rank
        FROM club_stats
        ORDER BY total_points DESC
    """)
    result = await db.execute(q, params)
    rows = result.all()
    return [
        {
            "club_id": str(r.club_id),
            "club_name": r.club_name,
            "member_count": r.member_count,
            "post_count": r.post_count,
            "active_members": r.active_members,
            "total_points": r.total_points,
            "rank": r.rank,
        }
        for r in rows
    ]


# ══════════════════════════════════════════════
#  4. ACTIVITY GRAPH (daily points last 30 days)
# ══════════════════════════════════════════════

async def activity_graph(db: AsyncSession, days: int = 30) -> list[dict]:
    """Daily activity counts (posts, comments, likes, events) for the last N days."""
    q = text(f"""
        SELECT
            TO_CHAR(DATE(created_at), 'YYYY-MM-DD') AS day,
            COUNT(CASE WHEN activity_type = 'post_created' THEN 1 END) AS posts,
            COUNT(CASE WHEN activity_type = 'comment_added' THEN 1 END) AS comments,
            COUNT(CASE WHEN activity_type IN ('post_liked', 'post_unliked') THEN 1 END) AS likes,
            COUNT(CASE WHEN activity_type IN ('event_created', 'event_attended') THEN 1 END) AS events,
            COUNT(CASE WHEN activity_type = 'club_activity' THEN 1 END) AS club_activities,
            COUNT(*) AS total
        FROM points
        WHERE created_at >= CURRENT_DATE - INTERVAL '{days} days'
        GROUP BY DATE(created_at)
        ORDER BY DATE(created_at) ASC
    """)
    result = await db.execute(q)
    rows = result.all()
    return [
        {
            "day": r.day,
            "posts": r.posts,
            "comments": r.comments,
            "likes": r.likes,
            "events": r.events,
            "club_activities": r.club_activities,
            "total": r.total,
        }
        for r in rows
    ]


# ══════════════════════════════════════════════
#  5. EVENT PARTICIPATION
# ══════════════════════════════════════════════

async def event_participation(db: AsyncSession, months: int = 6) -> list[dict]:
    """Monthly event counts and total RSVPs for the last N months."""
    q = text("""
        SELECT
            TO_CHAR(DATE_TRUNC('month', e.created_at), 'YYYY-MM') AS month,
            COUNT(DISTINCT e.id) AS events_created,
            COUNT(DISTINCT CASE WHEN r.status = 'going' THEN r.id END) AS rsvps_going,
            COUNT(DISTINCT CASE WHEN r.status = 'interested' THEN r.id END) AS rsvps_interested,
            e.event_type
        FROM events e
        LEFT JOIN rsvps r ON r.event_id = e.id
        WHERE e.created_at >= DATE_TRUNC('month', NOW()) - INTERVAL ':months months'
        GROUP BY DATE_TRUNC('month', e.created_at), e.event_type
        ORDER BY DATE_TRUNC('month', e.created_at) ASC
    """)
    result = await db.execute(q, {"months": months})
    rows = result.all()

    monthly: dict[str, dict] = {}
    for r in rows:
        m = r.month
        if m not in monthly:
            monthly[m] = {"month": m, "events_created": 0, "rsvps_going": 0, "rsvps_interested": 0}
        monthly[m]["events_created"] += r.events_created
        monthly[m]["rsvps_going"] += r.rsvps_going
        monthly[m]["rsvps_interested"] += r.rsvps_interested

    return list(monthly.values())


# ══════════════════════════════════════════════
#  6. MONTHLY STATISTICS (comprehensive)
# ══════════════════════════════════════════════

async def monthly_statistics(db: AsyncSession) -> dict:
    """Current month vs previous month comparison."""
    q = text("""
        WITH current_month AS (
            SELECT
                COUNT(DISTINCT CASE WHEN u.role = 'student' THEN u.id END) AS new_students,
                COUNT(DISTINCT p.id) AS posts,
                COUNT(DISTINCT c.id) AS comments,
                COUNT(DISTINCT l.id) AS likes,
                COUNT(DISTINCT e.id) AS events,
                COUNT(DISTINCT ch.id) AS channels_active,
                COALESCE(SUM(pt.points_value), 0) AS points_awarded
            FROM users u
            LEFT JOIN posts p ON p.author_id = u.id AND p.created_at >= DATE_TRUNC('month', NOW())
            LEFT JOIN comments c ON c.author_id = u.id AND c.created_at >= DATE_TRUNC('month', NOW())
            LEFT JOIN likes l ON l.user_id = u.id AND l.created_at >= DATE_TRUNC('month', NOW())
            LEFT JOIN events e ON e.creator_id = u.id AND e.created_at >= DATE_TRUNC('month', NOW())
            LEFT JOIN channels ch ON ch.created_at >= DATE_TRUNC('month', NOW())
            LEFT JOIN points pt ON pt.user_id = u.id AND pt.created_at >= DATE_TRUNC('month', NOW())
            WHERE u.is_active = true
        ),
        previous_month AS (
            SELECT
                COUNT(DISTINCT CASE WHEN u.role = 'student' THEN u.id END) AS new_students,
                COUNT(DISTINCT p.id) AS posts,
                COUNT(DISTINCT c.id) AS comments,
                COUNT(DISTINCT l.id) AS likes,
                COUNT(DISTINCT e.id) AS events,
                COUNT(DISTINCT ch.id) AS channels_active,
                COALESCE(SUM(pt.points_value), 0) AS points_awarded
            FROM users u
            LEFT JOIN posts p ON p.author_id = u.id
                AND p.created_at >= DATE_TRUNC('month', NOW()) - INTERVAL '1 month'
                AND p.created_at < DATE_TRUNC('month', NOW())
            LEFT JOIN comments c ON c.author_id = u.id
                AND c.created_at >= DATE_TRUNC('month', NOW()) - INTERVAL '1 month'
                AND c.created_at < DATE_TRUNC('month', NOW())
            LEFT JOIN likes l ON l.user_id = u.id
                AND l.created_at >= DATE_TRUNC('month', NOW()) - INTERVAL '1 month'
                AND l.created_at < DATE_TRUNC('month', NOW())
            LEFT JOIN events e ON e.creator_id = u.id
                AND e.created_at >= DATE_TRUNC('month', NOW()) - INTERVAL '1 month'
                AND e.created_at < DATE_TRUNC('month', NOW())
            LEFT JOIN channels ch ON ch.created_at >= DATE_TRUNC('month', NOW()) - INTERVAL '1 month'
                AND ch.created_at < DATE_TRUNC('month', NOW())
            LEFT JOIN points pt ON pt.user_id = u.id
                AND pt.created_at >= DATE_TRUNC('month', NOW()) - INTERVAL '1 month'
                AND pt.created_at < DATE_TRUNC('month', NOW())
            WHERE u.is_active = true
        )
        SELECT
            cm.new_students AS current_new_students,
            cm.posts AS current_posts,
            cm.comments AS current_comments,
            cm.likes AS current_likes,
            cm.events AS current_events,
            cm.points_awarded AS current_points,
            pm.new_students AS previous_new_students,
            pm.posts AS previous_posts,
            pm.comments AS previous_comments,
            pm.likes AS previous_likes,
            pm.events AS previous_events,
            pm.points_awarded AS previous_points
        FROM current_month cm, previous_month pm
    """)
    result = await db.execute(q)
    row = result.one()

    def _pct(curr, prev):
        if not prev:
            return 100 if curr > 0 else 0
        return round(((curr - prev) / prev) * 100, 1) if prev else 0

    return {
        "current_month": {
            "new_students": row.current_new_students,
            "posts": row.current_posts,
            "comments": row.current_comments,
            "likes": row.current_likes,
            "events": row.current_events,
            "points": row.current_points,
        },
        "previous_month": {
            "new_students": row.previous_new_students,
            "posts": row.previous_posts,
            "comments": row.previous_comments,
            "likes": row.previous_likes,
            "events": row.previous_events,
            "points": row.previous_points,
        },
        "growth": {
            "students": _pct(row.current_new_students, row.previous_new_students),
            "posts": _pct(row.current_posts, row.previous_posts),
            "comments": _pct(row.current_comments, row.previous_comments),
            "likes": _pct(row.current_likes, row.previous_likes),
            "events": _pct(row.current_events, row.previous_events),
            "points": _pct(row.current_points, row.previous_points),
        },
    }


# ══════════════════════════════════════════════
#  7. HOD DASHBOARD (department-scoped)
# ══════════════════════════════════════════════

async def hod_dashboard(db: AsyncSession, department_id: UUID) -> dict:
    """HOD-specific: department stats + top students + recent activity."""
    dept_q = text("""
        SELECT
            COUNT(DISTINCT CASE WHEN u.role = 'student' THEN u.id END) AS students,
            COUNT(DISTINCT CASE WHEN u.role = 'department_admin' THEN u.id END) AS faculty_count,
            COUNT(DISTINCT p.id) AS posts,
            COUNT(DISTINCT e.id) AS events,
            COUNT(DISTINCT cl.id) AS clubs,
            COALESCE(SUM(pt.points_value), 0) AS total_points
        FROM departments d
        LEFT JOIN users u ON u.department_id = d.id AND u.is_active = true
        LEFT JOIN posts p ON p.author_id = u.id
        LEFT JOIN events e ON e.creator_id = u.id
        LEFT JOIN clubs cl ON cl.department_id = d.id AND cl.is_active = true
        LEFT JOIN points pt ON pt.user_id = u.id
        WHERE d.id = :dept_id
        GROUP BY d.id
    """)
    dept_result = await db.execute(dept_q, {"dept_id": department_id})
    dept_row = dept_result.one_or_none()

    top_students_q = text("""
        SELECT
            u.id, u.full_name, u.avatar_url,
            COALESCE(SUM(pt.points_value), 0) AS total_points,
            RANK() OVER (ORDER BY SUM(pt.points_value) DESC) AS rank
        FROM users u
        LEFT JOIN points pt ON pt.user_id = u.id
        WHERE u.department_id = :dept_id AND u.role = 'student' AND u.is_active = true
        GROUP BY u.id, u.full_name, u.avatar_url
        ORDER BY total_points DESC
        LIMIT 10
    """)
    top_result = await db.execute(top_students_q, {"dept_id": department_id})
    top_students = [
        {"user_id": str(r.id), "name": r.full_name, "avatar": r.avatar_url, "points": r.total_points, "rank": r.rank}
        for r in top_result.all()
    ]

    recent_q = text("""
        SELECT
            TO_CHAR(pt.created_at, 'YYYY-MM-DD') AS day,
            COUNT(*) AS activities,
            COALESCE(SUM(pt.points_value), 0) AS points
        FROM points pt
        JOIN users u ON pt.user_id = u.id
        WHERE u.department_id = :dept_id
          AND pt.created_at >= NOW() - INTERVAL '30 days'
        GROUP BY DATE(pt.created_at)
        ORDER BY DATE(pt.created_at) ASC
    """)
    recent_result = await db.execute(recent_q, {"dept_id": department_id})
    activity_trend = [{"day": r.day, "activities": r.activities, "points": r.points} for r in recent_result.all()]

    return {
        "department": {
            "students": dept_row.students if dept_row else 0,
            "faculty_count": dept_row.faculty_count if dept_row else 0,
            "posts": dept_row.posts if dept_row else 0,
            "events": dept_row.events if dept_row else 0,
            "clubs": dept_row.clubs if dept_row else 0,
            "total_points": dept_row.total_points if dept_row else 0,
        },
        "top_students": top_students,
        "activity_trend": activity_trend,
    }


# ══════════════════════════════════════════════
#  8. FACULTY DASHBOARD
# ══════════════════════════════════════════════

async def hod_self_dashboard(db: AsyncSession, staff_id: UUID) -> dict:
    """HOD-specific: their channels, events, announcements, engagement."""
    channels_q = text("""
        SELECT ch.id, ch.name, ch.member_count, ch.type
        FROM channels ch
        WHERE ch.owner_id = :staff_id
        ORDER BY ch.created_at DESC
        LIMIT 10
    """)
    channels_result = await db.execute(channels_q, {"staff_id": staff_id})
    channels = [
        {"id": str(r.id), "name": r.name, "member_count": r.member_count, "type": r.type}
        for r in channels_result.all()
    ]

    events_q = text("""
        SELECT e.id, e.title, e.event_date, e.rsvp_count, e.event_type
        FROM events e
        WHERE e.creator_id = :staff_id
        ORDER BY e.event_date DESC
        LIMIT 10
    """)
    events_result = await db.execute(events_q, {"staff_id": staff_id})
    events = [
        {"id": str(r.id), "title": r.title, "event_date": r.event_date.isoformat(), "rsvp_count": r.rsvp_count, "event_type": r.event_type}
        for r in events_result.all()
    ]

    engagement_q = text("""
        SELECT
            COUNT(DISTINCT p.id) AS my_posts,
            COALESCE(SUM(p.like_count), 0) AS total_likes,
            COALESCE(SUM(p.comment_count), 0) AS total_comments
        FROM posts p
        WHERE p.author_id = :staff_id
    """)
    eng_result = await db.execute(engagement_q, {"staff_id": staff_id})
    eng_row = eng_result.one_or_none()

    monthly_q = text("""
        SELECT
            TO_CHAR(DATE_TRUNC('month', created_at), 'YYYY-MM') AS month,
            COUNT(*) AS posts
        FROM posts
        WHERE author_id = :staff_id
          AND created_at >= NOW() - INTERVAL '6 months'
        GROUP BY DATE_TRUNC('month', created_at)
        ORDER BY DATE_TRUNC('month', created_at) ASC
    """)
    monthly_result = await db.execute(monthly_q, {"staff_id": staff_id})
    monthly_posts = [{"month": r.month, "posts": r.posts} for r in monthly_result.all()]

    return {
        "channels": channels,
        "events": events,
        "engagement": {
            "my_posts": eng_row.my_posts if eng_row else 0,
            "total_likes": eng_row.total_likes if eng_row else 0,
            "total_comments": eng_row.total_comments if eng_row else 0,
        },
        "monthly_posts": monthly_posts,
    }


# ══════════════════════════════════════════════
#  9. PRINCIPAL DASHBOARD (full platform view)
# ══════════════════════════════════════════════

async def principal_dashboard(db: AsyncSession) -> dict:
    """Principal: full platform analytics with all charts."""
    overview_q = text("""
        SELECT
            COUNT(DISTINCT u.id) AS total_users,
            COUNT(DISTINCT CASE WHEN u.role = 'student' THEN u.id END) AS total_students,
            COUNT(DISTINCT CASE WHEN u.role = 'department_admin' THEN u.id END) AS total_faculty,
            COUNT(DISTINCT CASE WHEN u.role = 'super_admin' THEN u.id END) AS total_admins,
            COUNT(DISTINCT p.id) AS total_posts,
            COUNT(DISTINCT e.id) AS total_events,
            COUNT(DISTINCT ch.id) AS total_channels,
            COUNT(DISTINCT cl.id) AS total_clubs,
            COUNT(DISTINCT d.id) AS total_departments
        FROM users u
        LEFT JOIN posts p ON true
        LEFT JOIN events e ON true
        LEFT JOIN channels ch ON true
        LEFT JOIN clubs cl ON cl.is_active = true
        LEFT JOIN departments d ON d.is_active = true
        WHERE u.is_active = true
    """)
    overview_result = await db.execute(overview_q)
    overview = overview_result.one()

    dept_performance_q = text("""
        SELECT
            d.name AS dept_name,
            d.code AS dept_code,
            COUNT(DISTINCT CASE WHEN u.role = 'student' THEN u.id END) AS students,
            COUNT(DISTINCT p.id) AS posts,
            COALESCE(SUM(pt.points_value), 0) AS points
        FROM departments d
        LEFT JOIN users u ON u.department_id = d.id AND u.is_active = true
        LEFT JOIN posts p ON p.author_id = u.id
        LEFT JOIN points pt ON pt.user_id = u.id
        WHERE d.is_active = true
        GROUP BY d.id, d.name, d.code
        ORDER BY points DESC
    """)
    dept_result = await db.execute(dept_performance_q)
    dept_performance = [
        {"name": r.dept_name, "code": r.dept_code, "students": r.students, "posts": r.posts, "points": r.points}
        for r in dept_result.all()
    ]

    return {
        "overview": {
            "total_users": overview.total_users,
            "total_students": overview.total_students,
            "total_faculty": overview.total_faculty,
            "total_admins": overview.total_admins,
            "total_posts": overview.total_posts,
            "total_events": overview.total_events,
            "total_channels": overview.total_channels,
            "total_clubs": overview.total_clubs,
            "total_departments": overview.total_departments,
        },
        "department_performance": dept_performance,
    }

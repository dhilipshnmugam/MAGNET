"""
Analytics Engine
===============
SQLite-compatible queries for all dashboard analytics.
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
    q = text(f"""
        SELECT
            strftime('%Y-%m', created_at) AS month,
            COUNT(*) AS count
        FROM users
        WHERE role = 'student'
          AND created_at >= date('now', '-{months} months')
        GROUP BY strftime('%Y-%m', created_at)
        ORDER BY strftime('%Y-%m', created_at) ASC
    """)
    result = await db.execute(q)
    rows = result.all()
    return [{"month": r.month, "count": r.count} for r in rows]


# ══════════════════════════════════════════════
#  2. DEPARTMENT PERFORMANCE
# ══════════════════════════════════════════════

async def department_performance(db: AsyncSession) -> list[dict]:
    q = text("""
        SELECT
            d.id AS dept_id,
            d.name AS dept_name,
            d.code AS dept_code,
            COUNT(DISTINCT u.id) AS total_users,
            COUNT(DISTINCT CASE WHEN u.role = 'student' THEN u.id END) AS student_count,
            COUNT(DISTINCT CASE WHEN u.role = 'department_admin' THEN u.id END) AS faculty_count,
            COUNT(DISTINCT CASE WHEN u.last_seen_at >= date('now', '-30 days') THEN u.id END) AS active_users,
            COUNT(DISTINCT p.id) AS post_count,
            COUNT(DISTINCT e.id) AS event_count,
            COUNT(DISTINCT c.id) AS club_count,
            COALESCE(SUM(pt.points_value), 0) AS total_points
        FROM departments d
        LEFT JOIN users u ON u.department_id = d.id AND u.is_active = 1
        LEFT JOIN posts p ON p.author_id = u.id
        LEFT JOIN events e ON e.creator_id = u.id
        LEFT JOIN clubs c ON c.department_id = d.id AND c.is_active = 1
        LEFT JOIN points pt ON pt.user_id = u.id
        WHERE d.is_active = 1
        GROUP BY d.id, d.name, d.code
        ORDER BY total_points DESC
    """)
    result = await db.execute(q)
    rows = result.all()
    return [
        {
            "department_id": str(r.dept_id),
            "department_name": r.dept_name,
            "department_code": r.dept_code,
            "total_users": r.total_users,
            "student_count": r.student_count,
            "faculty_count": r.faculty_count,
            "active_users": r.active_users,
            "post_count": r.post_count,
            "event_count": r.event_count,
            "club_count": r.club_count,
            "total_points": r.total_points,
            "rank": i + 1,
        }
        for i, r in enumerate(rows)
    ]


# ══════════════════════════════════════════════
#  3. CLUB PERFORMANCE
# ══════════════════════════════════════════════

async def club_performance(db: AsyncSession, department_id: UUID | None = None) -> list[dict]:
    params = {}
    dept_filter = ""
    if department_id:
        dept_filter = "AND cl.department_id = :dept_id"
        params["dept_id"] = department_id

    q = text(f"""
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
        WHERE cl.is_active = 1 {dept_filter}
        GROUP BY cl.id, cl.name
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
            "rank": i + 1,
        }
        for i, r in enumerate(rows)
    ]


# ══════════════════════════════════════════════
#  4. ACTIVITY GRAPH (daily points last N days)
# ══════════════════════════════════════════════

async def activity_graph(db: AsyncSession, days: int = 30) -> list[dict]:
    q = text(f"""
        SELECT
            DATE(created_at) AS day,
            COUNT(CASE WHEN activity_type = 'post_created' THEN 1 END) AS posts,
            COUNT(CASE WHEN activity_type = 'comment_added' THEN 1 END) AS comments,
            COUNT(CASE WHEN activity_type IN ('post_liked', 'post_unliked') THEN 1 END) AS likes,
            COUNT(CASE WHEN activity_type IN ('event_created', 'event_attended') THEN 1 END) AS events,
            COUNT(CASE WHEN activity_type = 'club_activity' THEN 1 END) AS club_activities,
            COUNT(*) AS total
        FROM points
        WHERE created_at >= date('now', '-{days} days')
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
    q = text(f"""
        SELECT
            strftime('%Y-%m', e.created_at) AS month,
            COUNT(DISTINCT e.id) AS events_created,
            COUNT(DISTINCT CASE WHEN r.status = 'going' THEN r.id END) AS rsvps_going,
            COUNT(DISTINCT CASE WHEN r.status = 'interested' THEN r.id END) AS rsvps_interested
        FROM events e
        LEFT JOIN rsvps r ON r.event_id = e.id
        WHERE e.created_at >= date('now', '-{months} months')
        GROUP BY strftime('%Y-%m', e.created_at)
        ORDER BY strftime('%Y-%m', e.created_at) ASC
    """)
    result = await db.execute(q)
    rows = result.all()
    return [
        {
            "month": r.month,
            "events_created": r.events_created,
            "rsvps_going": r.rsvps_going,
            "rsvps_interested": r.rsvps_interested,
        }
        for r in rows
    ]


# ══════════════════════════════════════════════
#  6. MONTHLY STATISTICS (comprehensive)
# ══════════════════════════════════════════════

async def monthly_statistics(db: AsyncSession) -> dict:
    curr_start = text("date('now', 'start of month')")
    prev_start = text("date('now', 'start of month', '-1 month')")
    prev_end = text("date('now', 'start of month')")

    q = text(f"""
        SELECT
            (SELECT COUNT(DISTINCT u.id) FROM users u
             WHERE u.role = 'student' AND u.is_active = 1
               AND u.created_at >= {curr_start}) AS new_students,
            (SELECT COUNT(DISTINCT p.id) FROM posts p
             WHERE p.created_at >= {curr_start}) AS posts,
            (SELECT COUNT(DISTINCT c.id) FROM comments c
             WHERE c.created_at >= {curr_start}) AS comments,
            (SELECT COUNT(DISTINCT l.id) FROM likes l
             WHERE l.created_at >= {curr_start}) AS likes,
            (SELECT COUNT(DISTINCT e.id) FROM events e
             WHERE e.created_at >= {curr_start}) AS events,
            (SELECT COUNT(DISTINCT pt.id) FROM points pt
             WHERE pt.created_at >= {curr_start}) AS points_awarded,
            (SELECT COUNT(DISTINCT u2.id) FROM users u2
             WHERE u2.role = 'student' AND u2.is_active = 1
               AND u2.created_at >= {prev_start} AND u2.created_at < {prev_end}) AS prev_new_students,
            (SELECT COUNT(DISTINCT p2.id) FROM posts p2
             WHERE p2.created_at >= {prev_start} AND p2.created_at < {prev_end}) AS prev_posts,
            (SELECT COUNT(DISTINCT c2.id) FROM comments c2
             WHERE c2.created_at >= {prev_start} AND c2.created_at < {prev_end}) AS prev_comments,
            (SELECT COUNT(DISTINCT l2.id) FROM likes l2
             WHERE l2.created_at >= {prev_start} AND l2.created_at < {prev_end}) AS prev_likes,
            (SELECT COUNT(DISTINCT e2.id) FROM events e2
             WHERE e2.created_at >= {prev_start} AND e2.created_at < {prev_end}) AS prev_events,
            (SELECT COUNT(DISTINCT pt2.id) FROM points pt2
             WHERE pt2.created_at >= {prev_start} AND pt2.created_at < {prev_end}) AS prev_points_awarded
    """)
    result = await db.execute(q)
    row = result.one()

    def _pct(curr, prev):
        if not prev:
            return 100 if curr > 0 else 0
        return round(((curr - prev) / prev) * 100, 1)

    return {
        "current_month": {
            "new_students": row.new_students,
            "posts": row.posts,
            "comments": row.comments,
            "likes": row.likes,
            "events": row.events,
            "points": row.points_awarded,
        },
        "previous_month": {
            "new_students": row.prev_new_students,
            "posts": row.prev_posts,
            "comments": row.prev_comments,
            "likes": row.prev_likes,
            "events": row.prev_events,
            "points": row.prev_points_awarded,
        },
        "growth": {
            "students": _pct(row.new_students, row.prev_new_students),
            "posts": _pct(row.posts, row.prev_posts),
            "comments": _pct(row.comments, row.prev_comments),
            "likes": _pct(row.likes, row.prev_likes),
            "events": _pct(row.events, row.prev_events),
            "points": _pct(row.points_awarded, row.prev_points_awarded),
        },
    }


# ══════════════════════════════════════════════
#  7. HOD DASHBOARD (department-scoped)
# ══════════════════════════════════════════════

async def hod_dashboard(db: AsyncSession, department_id: UUID) -> dict:
    did = str(department_id)
    dept_q = text("""
        SELECT
            COUNT(DISTINCT CASE WHEN u.role = 'student' THEN u.id END) AS students,
            COUNT(DISTINCT CASE WHEN u.role = 'department_admin' THEN u.id END) AS faculty_count,
            COUNT(DISTINCT p.id) AS posts,
            COUNT(DISTINCT e.id) AS events,
            COUNT(DISTINCT cl.id) AS clubs,
            COALESCE(SUM(pt.points_value), 0) AS total_points
        FROM departments d
        LEFT JOIN users u ON u.department_id = d.id AND u.is_active = 1
        LEFT JOIN posts p ON p.author_id = u.id
        LEFT JOIN events e ON e.creator_id = u.id
        LEFT JOIN clubs cl ON cl.department_id = d.id AND cl.is_active = 1
        LEFT JOIN points pt ON pt.user_id = u.id
        WHERE d.id = :dept_id
        GROUP BY d.id
    """)
    dept_result = await db.execute(dept_q, {"dept_id": did})
    dept_row = dept_result.one_or_none()

    top_students_q = text("""
        SELECT
            u.id, u.full_name, u.avatar_url,
            COALESCE(SUM(pt.points_value), 0) AS total_points,
            ROW_NUMBER() OVER (ORDER BY SUM(pt.points_value) DESC) AS rank
        FROM users u
        LEFT JOIN points pt ON pt.user_id = u.id
        WHERE u.department_id = :dept_id AND u.role = 'student' AND u.is_active = 1
        GROUP BY u.id, u.full_name, u.avatar_url
        ORDER BY total_points DESC
        LIMIT 10
    """)
    top_result = await db.execute(top_students_q, {"dept_id": did})
    top_students = [
        {"user_id": str(r.id), "name": r.full_name, "avatar": r.avatar_url, "points": r.total_points, "rank": r.rank}
        for r in top_result.all()
    ]

    recent_q = text("""
        SELECT
            DATE(pt.created_at) AS day,
            COUNT(*) AS activities,
            COALESCE(SUM(pt.points_value), 0) AS points
        FROM points pt
        JOIN users u ON pt.user_id = u.id
        WHERE u.department_id = :dept_id
          AND pt.created_at >= date('now', '-30 days')
        GROUP BY DATE(pt.created_at)
        ORDER BY DATE(pt.created_at) ASC
    """)
    recent_result = await db.execute(recent_q, {"dept_id": did})
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
    sid = str(staff_id)
    channels_q = text("""
        SELECT ch.id, ch.name, ch.member_count, ch.type
        FROM channels ch
        WHERE ch.owner_id = :staff_id
        ORDER BY ch.created_at DESC
        LIMIT 10
    """)
    channels_result = await db.execute(channels_q, {"staff_id": sid})
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
    events_result = await db.execute(events_q, {"staff_id": sid})
    events = [
        {"id": str(r.id), "title": r.title, "event_date": r.event_date.isoformat() if r.event_date else "", "rsvp_count": r.rsvp_count, "event_type": r.event_type}
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
    eng_result = await db.execute(engagement_q, {"staff_id": sid})
    eng_row = eng_result.one_or_none()

    monthly_q = text("""
        SELECT
            strftime('%Y-%m', created_at) AS month,
            COUNT(*) AS posts
        FROM posts
        WHERE author_id = :staff_id
          AND created_at >= date('now', '-6 months')
        GROUP BY strftime('%Y-%m', created_at)
        ORDER BY strftime('%Y-%m', created_at) ASC
    """)
    monthly_result = await db.execute(monthly_q, {"staff_id": sid})
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
    overview_q = text("""
        SELECT
            COUNT(DISTINCT u.id) AS total_users,
            COUNT(DISTINCT CASE WHEN u.role = 'student' THEN u.id END) AS total_students,
            COUNT(DISTINCT CASE WHEN u.role = 'department_admin' THEN u.id END) AS total_faculty,
            COUNT(DISTINCT CASE WHEN u.role = 'super_admin' THEN u.id END) AS total_admins,
            COUNT(DISTINCT p.id) AS total_posts,
            COUNT(DISTINCT e.id) AS total_events,
            COUNT(DISTINCT ch.id) AS total_channels,
            (SELECT COUNT(DISTINCT c.id) FROM clubs c WHERE c.is_active = 1) AS total_clubs,
            (SELECT COUNT(DISTINCT d.id) FROM departments d WHERE d.is_active = 1) AS total_departments
        FROM users u
        LEFT JOIN posts p ON p.author_id = u.id
        LEFT JOIN events e ON e.creator_id = u.id
        LEFT JOIN channels ch ON ch.owner_id = u.id
        WHERE u.is_active = 1
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
        LEFT JOIN users u ON u.department_id = d.id AND u.is_active = 1
        LEFT JOIN posts p ON p.author_id = u.id
        LEFT JOIN points pt ON pt.user_id = u.id
        WHERE d.is_active = 1
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


# ══════════════════════════════════════════════
#  10. PRINCIPAL DEPARTMENT DETAILS (read-only drill-down)
# ══════════════════════════════════════════════

async def principal_department_details(db: AsyncSession, department_id: UUID) -> dict:
    did = str(department_id)

    dept_q = text("""
        SELECT
            d.id AS dept_id,
            d.name AS dept_name,
            d.code AS dept_code,
            d.department_type AS dept_type,
            d.description AS dept_desc,
            h.full_name AS head_name,
            h.email AS head_email,
            COUNT(DISTINCT u.id) AS total_users,
            COUNT(DISTINCT CASE WHEN u.role = 'student' THEN u.id END) AS students,
            COUNT(DISTINCT CASE WHEN u.role = 'department_admin' THEN u.id END) AS faculty_count,
            COUNT(DISTINCT CASE WHEN u.last_seen_at >= date('now', '-30 days') THEN u.id END) AS active_users,
            COUNT(DISTINCT p.id) AS posts,
            COUNT(DISTINCT e.id) AS events,
            COUNT(DISTINCT cl.id) AS clubs,
            COALESCE(SUM(pt.points_value), 0) AS total_points
        FROM departments d
        LEFT JOIN users h ON h.id = d.head_id
        LEFT JOIN users u ON u.department_id = d.id AND u.is_active = 1
        LEFT JOIN posts p ON p.author_id = u.id
        LEFT JOIN events e ON e.creator_id = u.id
        LEFT JOIN clubs cl ON cl.department_id = d.id AND cl.is_active = 1
        LEFT JOIN points pt ON pt.user_id = u.id
        WHERE d.id = :dept_id
        GROUP BY d.id, d.name, d.code, d.department_type, d.description, h.full_name, h.email
    """)
    dept_result = await db.execute(dept_q, {"dept_id": did})
    dept_row = dept_result.one_or_none()
    if dept_row is None:
        return None

    top_students_q = text("""
        SELECT
            u.id, u.full_name, u.avatar_url, u.register_number, u.year,
            COALESCE(SUM(pt.points_value), 0) AS total_points,
            ROW_NUMBER() OVER (ORDER BY SUM(pt.points_value) DESC) AS rank
        FROM users u
        LEFT JOIN points pt ON pt.user_id = u.id
        WHERE u.department_id = :dept_id AND u.role = 'student' AND u.is_active = 1
        GROUP BY u.id, u.full_name, u.avatar_url, u.register_number, u.year
        ORDER BY total_points DESC
        LIMIT 10
    """)
    top_result = await db.execute(top_students_q, {"dept_id": did})
    top_students = [
        {
            "user_id": str(r.id),
            "name": r.full_name,
            "avatar": r.avatar_url,
            "register_number": r.register_number,
            "year": r.year,
            "points": r.total_points,
            "rank": r.rank,
        }
        for r in top_result.all()
    ]

    activity_q = text("""
        SELECT
            DATE(pt.created_at) AS day,
            COUNT(*) AS activities,
            COALESCE(SUM(pt.points_value), 0) AS points
        FROM points pt
        JOIN users u ON pt.user_id = u.id
        WHERE u.department_id = :dept_id
          AND pt.created_at >= date('now', '-30 days')
        GROUP BY DATE(pt.created_at)
        ORDER BY DATE(pt.created_at) ASC
    """)
    activity_result = await db.execute(activity_q, {"dept_id": did})
    activity_trend = [
        {"day": r.day, "activities": r.activities, "points": r.points}
        for r in activity_result.all()
    ]

    posts_over_time_q = text("""
        SELECT
            strftime('%Y-%m', p.created_at) AS month,
            COUNT(*) AS posts
        FROM posts p
        JOIN users u ON p.author_id = u.id
        WHERE u.department_id = :dept_id
          AND p.created_at >= date('now', '-6 months')
        GROUP BY strftime('%Y-%m', p.created_at)
        ORDER BY strftime('%Y-%m', p.created_at) ASC
    """)
    posts_result = await db.execute(posts_over_time_q, {"dept_id": did})
    posts_over_time = [{"month": r.month, "posts": r.posts} for r in posts_result.all()]

    return {
        "department": {
            "id": str(dept_row.dept_id),
            "name": dept_row.dept_name,
            "code": dept_row.dept_code,
            "department_type": dept_row.dept_type,
            "description": dept_row.dept_desc,
            "head_name": dept_row.head_name,
            "head_email": dept_row.head_email,
            "total_users": dept_row.total_users,
            "students": dept_row.students,
            "faculty_count": dept_row.faculty_count,
            "active_users": dept_row.active_users,
            "posts": dept_row.posts,
            "events": dept_row.events,
            "clubs": dept_row.clubs,
            "total_points": dept_row.total_points,
        },
        "top_students": top_students,
        "activity_trend": activity_trend,
        "posts_over_time": posts_over_time,
    }

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, extract
from typing import Optional
from uuid import UUID
from datetime import datetime, timedelta, date
from app.dependencies import get_db, get_current_user, require_principal
from app.models.user import User
from app.models.post import Post
from app.models.activity import UserActivity
from app.models.points import Point
from app.models.project import Project, ProjectMember
from app.models.club import ClubMember
from app.schemas.common import ResponseModel
from app.services import analytics_engine
from app.utils.datetime_utils import utc_isoformat

router = APIRouter(prefix="/analytics", tags=["Analytics"])


@router.get("/overview")
async def get_analytics_overview(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    posts_result = await db.execute(select(func.count(Post.id)).where(Post.author_id == current_user.id))
    posts = posts_result.scalar() or 0

    likes_result = await db.execute(select(func.sum(Post.like_count)).where(Post.author_id == current_user.id))
    total_likes = likes_result.scalar() or 0

    comments_result = await db.execute(select(func.sum(Post.comment_count)).where(Post.author_id == current_user.id))
    total_comments = comments_result.scalar() or 0

    shares_result = await db.execute(select(func.sum(Post.share_count)).where(Post.author_id == current_user.id))
    total_shares = shares_result.scalar() or 0

    views_result = await db.execute(select(func.sum(Post.view_count)).where(Post.author_id == current_user.id))
    total_views = views_result.scalar() or 0

    owned_result = await db.execute(select(func.count(Project.id)).where(Project.owner_id == current_user.id))
    projects_owned = owned_result.scalar() or 0

    member_result = await db.execute(
        select(func.count(ProjectMember.id)).where(ProjectMember.user_id == current_user.id)
    )
    projects_member = member_result.scalar() or 0

    clubs_result = await db.execute(
        select(func.count(ClubMember.id)).where(ClubMember.user_id == current_user.id)
    )
    clubs_count = clubs_result.scalar() or 0

    points_result = await db.execute(
        select(func.coalesce(func.sum(Point.points_earned), 0)).where(Point.user_id == current_user.id)
    )
    points_earned = points_result.scalar() or 0

    return {
        "posts": posts,
        "total_likes": total_likes,
        "total_comments": total_comments,
        "total_shares": total_shares,
        "total_views": total_views,
        "projects": projects_owned + projects_member,
        "clubs": clubs_count,
        "points": points_earned,
    }


@router.get("/posts")
async def get_post_analytics(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Post).where(Post.author_id == current_user.id).order_by(Post.created_at.desc())
    )
    posts = result.scalars().all()
    return {
        "posts": [
            {
                "id": str(p.id),
                "content": p.content[:100] if p.content else None,
                "like_count": p.like_count or 0,
                "comment_count": p.comment_count or 0,
                "share_count": p.share_count or 0,
                "view_count": p.view_count or 0,
                "bookmark_count": p.bookmark_count or 0,
                "created_at": utc_isoformat(p.created_at),
            }
            for p in posts
        ]
    }


@router.get("/heatmap")
async def get_activity_heatmap(
    year: Optional[int] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not year:
        year = datetime.utcnow().year

    result = await db.execute(
        select(UserActivity).where(
            UserActivity.user_id == current_user.id,
            extract("year", UserActivity.activity_date) == year,
        ).order_by(UserActivity.activity_date)
    )
    activities = result.scalars().all()

    heatmap_data = {}
    max_count = 0
    for a in activities:
        heatmap_data[utc_isoformat(a.activity_date)] = {
            "count": a.action_count,
            "hours": a.hours_spent,
        }
        if a.action_count > max_count:
            max_count = a.action_count

    return {
        "year": year,
        "data": heatmap_data,
        "max_count": max_count,
    }


@router.post("/activity/log")
async def log_activity(
    payload: dict,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    count = payload.get("count", 1)
    hours = payload.get("hours", 0)

    today = date.today()
    result = await db.execute(
        select(UserActivity).where(
            UserActivity.user_id == current_user.id,
            UserActivity.activity_date == today,
        )
    )
    activity = result.scalar_one_or_none()

    if activity:
        activity.action_count += count
        activity.hours_spent += hours
    else:
        activity = UserActivity(
            user_id=current_user.id,
            activity_date=today,
            action_count=count,
            hours_spent=hours,
        )
        db.add(activity)

    await db.commit()
    return {"message": "Activity logged"}


@router.get("/trends")
async def get_analytics_trends(
    period: str = Query("week", pattern="^(week|month|year)$"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    now = datetime.utcnow()
    if period == "week":
        since = now - timedelta(days=7)
        group = func.date(Post.created_at)
    elif period == "month":
        since = now - timedelta(days=30)
        group = func.date(Post.created_at)
    else:
        since = now - timedelta(days=365)
        group = func.date_trunc("month", Post.created_at)

    q = select(
        group.label("date"),
        func.count(Post.id).label("count"),
    ).where(
        Post.author_id == current_user.id,
        Post.created_at >= since,
    ).group_by(group).order_by("date")

    result = await db.execute(q)
    rows = result.all()

    return {
        "period": period,
        "posts_over_time": [
            {"date": str(r.date), "count": r.count} for r in rows
        ],
    }


@router.get("/student-growth")
async def get_student_growth(
    months: Optional[int] = Query(12),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    data = await analytics_engine.student_growth(db, months or 12)
    return ResponseModel(data=data)


@router.get("/activity-graph")
async def get_activity_graph(
    days: Optional[int] = Query(30),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    data = await analytics_engine.activity_graph(db, days or 30)
    return ResponseModel(data=data)


@router.get("/event-participation")
async def get_event_participation(
    months: Optional[int] = Query(6),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    data = await analytics_engine.event_participation(db, months or 6)
    return ResponseModel(data=data)


@router.get("/monthly-statistics")
async def get_monthly_statistics(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    data = await analytics_engine.monthly_statistics(db)
    return ResponseModel(data=data)


@router.get("/department-performance")
async def get_department_performance(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    data = await analytics_engine.department_performance(db)
    return ResponseModel(data=data)


@router.get("/club-performance")
async def get_club_performance(
    department_id: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    dept_uuid = UUID(department_id) if department_id else None
    data = await analytics_engine.club_performance(db, dept_uuid)
    return ResponseModel(data=data)


@router.get("/hod-dashboard")
async def get_hod_dashboard(
    department_id: str = Query(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    data = await analytics_engine.hod_dashboard(db, UUID(department_id))
    return ResponseModel(data=data)


@router.get("/hod-self-dashboard")
async def get_hod_self_dashboard(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    data = await analytics_engine.hod_self_dashboard(db, current_user.id)
    return ResponseModel(data=data)


@router.get("/principal-dashboard")
async def get_principal_dashboard(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    data = await analytics_engine.principal_dashboard(db)
    return ResponseModel(data=data)


@router.get("/principal-department")
async def get_principal_department_details(
    department_id: str = Query(...),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_principal),
):
    try:
        dept_uuid = UUID(department_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid department ID")
    data = await analytics_engine.principal_department_details(db, dept_uuid)
    if data is None:
        raise HTTPException(status_code=404, detail="Department not found")
    return ResponseModel(data=data)

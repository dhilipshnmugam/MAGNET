from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from fastapi import HTTPException, status
from app.models.user import User
from app.models.post import Post
from app.models.channel import Channel
from app.models.event import Event
from app.models.approval import ApprovalRequest
from app.models.activity_log import ActivityLog
from app.services import notification_service


async def get_dashboard_stats(db: AsyncSession) -> dict:
    total_users = (await db.execute(select(func.count()).select_from(User))).scalar()
    total_posts = (await db.execute(select(func.count()).select_from(Post))).scalar()
    total_channels = (await db.execute(select(func.count()).select_from(Channel))).scalar()
    total_events = (await db.execute(select(func.count()).select_from(Event))).scalar()
    active_users = (await db.execute(select(func.count()).select_from(User).where(User.is_active == True))).scalar()
    pending_approvals = (await db.execute(
        select(func.count()).select_from(ApprovalRequest).where(ApprovalRequest.status == "pending")
    )).scalar()

    recent_users_result = await db.execute(
        select(User).order_by(User.created_at.desc()).limit(5)
    )
    recent_users = [
        {"id": str(u.id), "full_name": u.full_name, "email": u.email, "role": u.role, "created_at": str(u.created_at)}
        for u in recent_users_result.scalars().all()
    ]

    return {
        "total_users": total_users,
        "total_posts": total_posts,
        "total_channels": total_channels,
        "total_events": total_events,
        "active_users": active_users,
        "pending_approvals": pending_approvals,
        "recent_users": recent_users,
    }


async def list_all_users(
    db: AsyncSession, search: str = None, role: str = None,
    is_active: bool = None, page: int = 1, page_size: int = 20
) -> tuple[list[User], int]:
    query = select(User)

    if search:
        query = query.where(User.full_name.ilike(f"%{search}%") | User.email.ilike(f"%{search}%"))
    if role:
        query = query.where(User.role == role)
    if is_active is not None:
        query = query.where(User.is_active == is_active)

    count_q = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_q)).scalar()

    query = query.order_by(User.created_at.desc()).offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(query)
    users = list(result.scalars().all())

    return users, total


async def list_all_channels(
    db: AsyncSession, page: int = 1, page_size: int = 20
) -> tuple[list[Channel], int]:
    query = select(Channel)

    count_q = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_q)).scalar()

    query = query.order_by(Channel.created_at.desc()).offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(query)
    channels = list(result.scalars().all())

    return channels, total


async def get_pending_approvals(
    db: AsyncSession, page: int = 1, page_size: int = 20
) -> tuple[list[ApprovalRequest], int]:
    query = (
        select(ApprovalRequest)
        .options(selectinload(ApprovalRequest.user))
        .where(ApprovalRequest.status == "pending")
        .order_by(ApprovalRequest.created_at.asc())
    )

    count_q = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_q)).scalar()

    query = query.offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(query)
    requests = list(result.scalars().unique().all())

    return requests, total


async def review_approval(
    db: AsyncSession, request_id: UUID, reviewer: User, status_val: str, review_note: str = None
) -> ApprovalRequest:
    result = await db.execute(
        select(ApprovalRequest).where(ApprovalRequest.id == request_id)
    )
    request = result.scalar_one_or_none()
    if not request:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Request not found")

    if request.status != "pending":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Request already reviewed")

    request.status = status_val
    request.reviewed_by = reviewer.id
    request.review_note = review_note

    if request.request_type == "registration" and status_val == "approved":
        user_result = await db.execute(select(User).where(User.id == request.user_id))
        user = user_result.scalar_one_or_none()
        if user:
            user.is_verified = True

    if status_val == "approved":
        await notification_service.notify_approval(db, request.user_id, status_val, request.request_type, review_note)
    elif status_val == "rejected":
        await notification_service.notify_rejected(db, request.user_id, request.request_type, review_note)

    await db.flush()
    return request


async def log_activity(
    db: AsyncSession, user_id: UUID = None, action: str = "",
    entity_type: str = None, entity_id: UUID = None,
    ip_address: str = None, user_agent: str = None, metadata: dict = None
) -> ActivityLog:
    log = ActivityLog(
        user_id=user_id,
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        ip_address=ip_address,
        user_agent=user_agent,
        metadata=metadata,
    )
    db.add(log)
    await db.flush()
    return log

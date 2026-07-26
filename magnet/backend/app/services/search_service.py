from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_
from sqlalchemy.orm import selectinload
from app.models.user import User
from app.models.channel import Channel
from app.models.post import Post
from app.models.club import Club


async def global_search(db: AsyncSession, q: str, user: User, limit: int = 10) -> dict:
    users_result = await db.execute(
        select(User)
        .where(
            User.is_active == True,
            or_(
                User.full_name.ilike(f"%{q}%"),
                User.email.ilike(f"%{q}%"),
            )
        )
        .limit(limit)
    )
    users = [
        {"id": str(u.id), "full_name": u.full_name, "avatar_url": u.avatar_url, "role": u.role, "type": "user"}
        for u in users_result.scalars().all()
    ]

    channels_result = await db.execute(
        select(Channel)
        .where(Channel.is_active == True, Channel.name.ilike(f"%{q}%"))
        .limit(limit)
    )
    channels = [
        {"id": str(c.id), "name": c.name, "slug": c.slug, "type": c.type, "member_count": c.member_count, "entity_type": "channel"}
        for c in channels_result.scalars().all()
    ]

    posts_result = await db.execute(
        select(Post)
        .where(Post.is_approved == True, Post.content.ilike(f"%{q}%"))
        .order_by(Post.created_at.desc())
        .limit(limit)
    )
    posts = [
        {"id": str(p.id), "content": p.content[:200], "author_id": str(p.author_id), "like_count": p.like_count, "type": "post"}
        for p in posts_result.scalars().all()
    ]

    clubs_result = await db.execute(
        select(Club)
        .where(Club.is_active == True, Club.name.ilike(f"%{q}%"))
        .limit(limit)
    )
    clubs = [
        {"id": str(c.id), "name": c.name, "description": c.description, "type": "club"}
        for c in clubs_result.scalars().all()
    ]

    return {
        "users": users,
        "channels": channels,
        "posts": posts,
        "clubs": clubs,
    }

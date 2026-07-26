from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from fastapi import HTTPException, status
from app.models.announcement import Announcement
from app.models.user import User
from app.schemas.announcement import AnnouncementCreate


async def create_announcement(db: AsyncSession, author: User, data: AnnouncementCreate) -> Announcement:
    announcement = Announcement(
        author_id=author.id,
        title=data.title,
        content=data.content,
        target_type=data.target_type,
        target_value=data.target_value,
    )
    db.add(announcement)
    await db.flush()
    return announcement


async def list_announcements(
    db: AsyncSession, user: User, page: int = 1, page_size: int = 20
) -> tuple[list[Announcement], int]:
    query = (
        select(Announcement)
        .options(selectinload(Announcement.author))
        .where(Announcement.is_active == True)
    )

    if user.role == "student":
        query = query.where(
            (Announcement.target_type == "all") |
            (Announcement.target_type == "department") |
            (Announcement.target_type == "users")
        )

    query = query.order_by(Announcement.is_pinned.desc(), Announcement.created_at.desc())

    count_q = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_q)).scalar()

    query = query.offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(query)
    announcements = list(result.scalars().unique().all())

    return announcements, total


async def get_announcement_by_id(db: AsyncSession, announcement_id: UUID) -> Announcement:
    result = await db.execute(
        select(Announcement)
        .options(selectinload(Announcement.author))
        .where(Announcement.id == announcement_id)
    )
    announcement = result.scalar_one_or_none()
    if not announcement:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Announcement not found")
    return announcement


async def delete_announcement(db: AsyncSession, announcement_id: UUID, user: User) -> bool:
    announcement = await get_announcement_by_id(db, announcement_id)

    if announcement.author_id != user.id and user.role not in ("super_admin", "principal"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")

    await db.delete(announcement)
    await db.flush()
    return True

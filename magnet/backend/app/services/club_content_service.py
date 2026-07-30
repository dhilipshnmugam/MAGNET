from uuid import UUID
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from fastapi import HTTPException, status
from app.models.club import Club, ClubMember, ClubEvent, ClubGallery, ClubAchievement


async def _ensure_member(db: AsyncSession, club_id: UUID, user_id: UUID):
    result = await db.execute(
        select(ClubMember).where(ClubMember.club_id == club_id, ClubMember.user_id == user_id)
    )
    return result.scalar_one_or_none()


async def _ensure_admin(db: AsyncSession, club_id: UUID, user_id: UUID):
    club = await db.execute(select(Club).where(Club.id == club_id))
    club_obj = club.scalar_one_or_none()
    if not club_obj:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Club not found")
    if club_obj.club_admin_id == user_id or club_obj.owner_id == user_id:
        return club_obj
    member = await _ensure_member(db, club_id, user_id)
    if member and member.role in ("owner", "admin"):
        return club_obj
    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized for this club")


# --- Club Events ---

async def create_club_event(db: AsyncSession, club_id: UUID, creator, data: dict) -> ClubEvent:
    await _ensure_admin(db, club_id, creator.id)
    event = ClubEvent(
        club_id=club_id,
        created_by=creator.id,
        title=data["title"],
        description=data.get("description"),
        event_date=data["event_date"],
        end_date=data.get("end_date"),
        venue=data.get("venue"),
        event_type=data.get("event_type", "general"),
        banner_url=data.get("banner_url"),
    )
    db.add(event)
    await db.flush()
    await db.refresh(event)
    return event


async def list_club_events(db: AsyncSession, club_id: UUID, page: int = 1, page_size: int = 20):
    count_q = select(func.count()).select_from(ClubEvent).where(ClubEvent.club_id == club_id, ClubEvent.is_active == True)
    total = (await db.execute(count_q)).scalar() or 0

    query = (
        select(ClubEvent)
        .options(selectinload(ClubEvent.creator))
        .where(ClubEvent.club_id == club_id, ClubEvent.is_active == True)
        .order_by(ClubEvent.event_date.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    result = await db.execute(query)
    events = list(result.scalars().unique().all())
    return events, total


async def delete_club_event(db: AsyncSession, club_id: UUID, event_id: UUID, user):
    await _ensure_admin(db, club_id, user.id)
    result = await db.execute(
        select(ClubEvent).where(ClubEvent.id == event_id, ClubEvent.club_id == club_id)
    )
    event = result.scalar_one_or_none()
    if not event:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found")
    event.is_active = False
    await db.flush()
    return True


# --- Club Gallery ---

async def add_gallery_item(db: AsyncSession, club_id: UUID, uploader, data: dict) -> ClubGallery:
    await _ensure_admin(db, club_id, uploader.id)
    item = ClubGallery(
        club_id=club_id,
        uploaded_by=uploader.id,
        image_url=data["image_url"],
        caption=data.get("caption"),
        event_name=data.get("event_name"),
    )
    db.add(item)
    await db.flush()
    await db.refresh(item)
    return item


async def list_club_gallery(db: AsyncSession, club_id: UUID, page: int = 1, page_size: int = 20):
    count_q = select(func.count()).select_from(ClubGallery).where(ClubGallery.club_id == club_id)
    total = (await db.execute(count_q)).scalar() or 0

    query = (
        select(ClubGallery)
        .options(selectinload(ClubGallery.uploader))
        .where(ClubGallery.club_id == club_id)
        .order_by(ClubGallery.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    result = await db.execute(query)
    items = list(result.scalars().unique().all())
    return items, total


async def delete_gallery_item(db: AsyncSession, club_id: UUID, item_id: UUID, user):
    await _ensure_admin(db, club_id, user.id)
    result = await db.execute(
        select(ClubGallery).where(ClubGallery.id == item_id, ClubGallery.club_id == club_id)
    )
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Gallery item not found")
    await db.delete(item)
    await db.flush()
    return True


# --- Club Achievements ---

async def add_achievement(db: AsyncSession, club_id: UUID, data: dict) -> ClubAchievement:
    achievement = ClubAchievement(
        club_id=club_id,
        title=data["title"],
        description=data.get("description"),
        achievement_type=data.get("achievement_type", "general"),
        achieved_date=data.get("achieved_date"),
        certificate_url=data.get("certificate_url"),
    )
    db.add(achievement)
    await db.flush()
    await db.refresh(achievement)
    return achievement


async def list_achievements(db: AsyncSession, club_id: UUID, page: int = 1, page_size: int = 20):
    count_q = select(func.count()).select_from(ClubAchievement).where(ClubAchievement.club_id == club_id)
    total = (await db.execute(count_q)).scalar() or 0

    query = (
        select(ClubAchievement)
        .where(ClubAchievement.club_id == club_id)
        .order_by(ClubAchievement.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    result = await db.execute(query)
    items = list(result.scalars().unique().all())
    return items, total


async def delete_achievement(db: AsyncSession, club_id: UUID, achievement_id: UUID, user):
    result = await db.execute(
        select(ClubAchievement).where(ClubAchievement.id == achievement_id, ClubAchievement.club_id == club_id)
    )
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Achievement not found")
    await db.delete(item)
    await db.flush()
    return True

from uuid import UUID
from datetime import datetime
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel
from app.dependencies import get_db, get_current_user, require_club_admin
from app.models.user import User
from app.schemas.common import ResponseModel, PaginatedResponse
from app.schemas.post import PostOut
from app.services import club_content_service, post_service

router = APIRouter(prefix="/clubs/{club_id}", tags=["Club Content"])


# --- Posts ---

@router.get("/posts", response_model=PaginatedResponse)
async def list_posts(
    club_id: UUID,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    posts, total = await post_service.get_club_posts(db, club_id, user, page, page_size)
    return PaginatedResponse(
        data=[PostOut.model_validate(p).model_dump() for p in posts],
        total=total, page=page, page_size=page_size,
        has_next=(page * page_size) < total,
    )


# --- Events ---

class ClubEventCreate(BaseModel):
    title: str
    description: str | None = None
    event_date: datetime
    end_date: datetime | None = None
    venue: str | None = None
    event_type: str = "general"
    banner_url: str | None = None


@router.post("/events", response_model=ResponseModel)
async def create_event(
    club_id: UUID,
    data: ClubEventCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    event = await club_content_service.create_club_event(db, club_id, user, data.model_dump())
    return ResponseModel(
        data={
            "id": str(event.id),
            "club_id": str(event.club_id),
            "title": event.title,
            "description": event.description,
            "event_date": event.event_date.isoformat(),
            "end_date": event.end_date.isoformat() if event.end_date else None,
            "venue": event.venue,
            "event_type": event.event_type,
            "banner_url": event.banner_url,
            "rsvp_count": event.rsvp_count,
            "created_at": event.created_at.isoformat(),
        },
        message="Event created successfully",
    )


@router.get("/events", response_model=PaginatedResponse)
async def list_events(
    club_id: UUID,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    events, total = await club_content_service.list_club_events(db, club_id, page, page_size)
    data = [
        {
            "id": str(e.id),
            "club_id": str(e.club_id),
            "title": e.title,
            "description": e.description,
            "event_date": e.event_date.isoformat(),
            "end_date": e.end_date.isoformat() if e.end_date else None,
            "venue": e.venue,
            "event_type": e.event_type,
            "banner_url": e.banner_url,
            "rsvp_count": e.rsvp_count,
            "is_active": e.is_active,
            "created_at": e.created_at.isoformat(),
            "creator_name": e.creator.full_name if e.creator else None,
        }
        for e in events
    ]
    return PaginatedResponse(data=data, total=total, page=page, page_size=page_size, has_next=(page * page_size) < total)


@router.delete("/events/{event_id}", response_model=ResponseModel)
async def delete_event(
    club_id: UUID,
    event_id: UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    await club_content_service.delete_club_event(db, club_id, event_id, user)
    return ResponseModel(message="Event deleted successfully")


# --- Gallery ---

class GalleryItemCreate(BaseModel):
    image_url: str
    caption: str | None = None
    event_name: str | None = None


@router.post("/gallery", response_model=ResponseModel)
async def add_gallery_item(
    club_id: UUID,
    data: GalleryItemCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    item = await club_content_service.add_gallery_item(db, club_id, user, data.model_dump())
    return ResponseModel(
        data={
            "id": str(item.id),
            "club_id": str(item.club_id),
            "image_url": item.image_url,
            "caption": item.caption,
            "event_name": item.event_name,
            "created_at": item.created_at.isoformat(),
        },
        message="Gallery item added successfully",
    )


@router.get("/gallery", response_model=PaginatedResponse)
async def list_gallery(
    club_id: UUID,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    items, total = await club_content_service.list_club_gallery(db, club_id, page, page_size)
    data = [
        {
            "id": str(i.id),
            "club_id": str(i.club_id),
            "image_url": i.image_url,
            "caption": i.caption,
            "event_name": i.event_name,
            "created_at": i.created_at.isoformat(),
            "uploader_name": i.uploader.full_name if i.uploader else None,
        }
        for i in items
    ]
    return PaginatedResponse(data=data, total=total, page=page, page_size=page_size, has_next=(page * page_size) < total)


@router.delete("/gallery/{item_id}", response_model=ResponseModel)
async def delete_gallery_item(
    club_id: UUID,
    item_id: UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    await club_content_service.delete_gallery_item(db, club_id, item_id, user)
    return ResponseModel(message="Gallery item deleted successfully")


# --- Achievements ---

class AchievementCreate(BaseModel):
    title: str
    description: str | None = None
    achievement_type: str = "general"
    achieved_date: datetime | None = None
    certificate_url: str | None = None


@router.post("/achievements", response_model=ResponseModel)
async def create_achievement(
    club_id: UUID,
    data: AchievementCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_club_admin),
):
    item = await club_content_service.add_achievement(db, club_id, data.model_dump())
    return ResponseModel(
        data={
            "id": str(item.id),
            "club_id": str(item.club_id),
            "title": item.title,
            "description": item.description,
            "achievement_type": item.achievement_type,
            "achieved_date": item.achieved_date.isoformat() if item.achieved_date else None,
            "certificate_url": item.certificate_url,
            "created_at": item.created_at.isoformat(),
        },
        message="Achievement added successfully",
    )


@router.get("/achievements", response_model=PaginatedResponse)
async def list_achievements(
    club_id: UUID,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    items, total = await club_content_service.list_achievements(db, club_id, page, page_size)
    data = [
        {
            "id": str(i.id),
            "club_id": str(i.club_id),
            "title": i.title,
            "description": i.description,
            "achievement_type": i.achievement_type,
            "achieved_date": i.achieved_date.isoformat() if i.achieved_date else None,
            "certificate_url": i.certificate_url,
            "created_at": i.created_at.isoformat(),
        }
        for i in items
    ]
    return PaginatedResponse(data=data, total=total, page=page, page_size=page_size, has_next=(page * page_size) < total)


@router.delete("/achievements/{achievement_id}", response_model=ResponseModel)
async def delete_achievement(
    club_id: UUID,
    achievement_id: UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_club_admin),
):
    await club_content_service.delete_achievement(db, club_id, achievement_id, user)
    return ResponseModel(message="Achievement deleted successfully")

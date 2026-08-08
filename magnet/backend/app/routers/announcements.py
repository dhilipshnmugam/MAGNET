from uuid import UUID
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.dependencies import get_db, get_current_user, require_admin_or_principal
from app.models.user import User
from app.schemas.announcement import AnnouncementCreate, AnnouncementOut
from app.schemas.common import ResponseModel, PaginatedResponse
from app.services import announcement_service

router = APIRouter(prefix="/announcements", tags=["Announcements"])


@router.post("", response_model=ResponseModel, status_code=201)
@router.post("/", response_model=ResponseModel, status_code=201)
async def create_announcement(
    data: AnnouncementCreate, db: AsyncSession = Depends(get_db), user: User = Depends(require_admin_or_principal)
):
    announcement = await announcement_service.create_announcement(db, user, data)
    return ResponseModel(
        data=AnnouncementOut.model_validate(announcement).model_dump(),
        message="Announcement created"
    )


@router.get("", response_model=PaginatedResponse)
@router.get("/", response_model=PaginatedResponse)
async def list_announcements(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    announcements, total = await announcement_service.list_announcements(db, user, page, page_size)
    return PaginatedResponse(
        data=[AnnouncementOut.model_validate(a).model_dump() for a in announcements],
        total=total, page=page, page_size=page_size,
        has_next=(page * page_size) < total,
    )


@router.get("/{announcement_id}", response_model=ResponseModel)
async def get_announcement(announcement_id: UUID, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    announcement = await announcement_service.get_announcement_by_id(db, announcement_id)
    return ResponseModel(data=AnnouncementOut.model_validate(announcement).model_dump())


@router.delete("/{announcement_id}", response_model=ResponseModel)
async def delete_announcement(
    announcement_id: UUID, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)
):
    await announcement_service.delete_announcement(db, announcement_id, user)
    return ResponseModel(message="Announcement deleted")

from uuid import UUID
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel
from app.dependencies import get_db, require_super_admin
from app.models.user import User
from app.schemas.club import ClubCreate, ClubUpdate, ClubOut, ClubDetailOut
from app.schemas.common import ResponseModel, PaginatedResponse
from app.services import club_management_service

router = APIRouter(prefix="/clubs", tags=["Clubs"])


class AssignAdminRequest(BaseModel):
    user_id: UUID


@router.get("/stats/overview", response_model=ResponseModel)
async def club_stats(
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_super_admin),
):
    stats = await club_management_service.get_club_stats(db)
    return ResponseModel(data=stats)


@router.get("/", response_model=PaginatedResponse)
async def list_clubs(
    search: str = Query(None),
    domain: str = Query(None),
    status: str = Query(None, alias="status"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    clubs, total = await club_management_service.list_clubs(
        db, search, domain, status, page, page_size
    )
    return PaginatedResponse(
        data=[ClubOut.model_validate(club_management_service._build_club_out(c)).model_dump() for c in clubs],
        total=total, page=page, page_size=page_size,
        has_next=(page * page_size) < total,
    )


@router.get("/{club_id}", response_model=ResponseModel)
async def get_club(
    club_id: UUID,
    db: AsyncSession = Depends(get_db),
):
    data = await club_management_service.get_club_by_id(db, club_id)
    return ResponseModel(data=ClubDetailOut(**data).model_dump())


@router.post("/", response_model=ResponseModel)
async def create_club(
    data: ClubCreate,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_super_admin),
):
    club = await club_management_service.create_club(db, data.model_dump(), admin)
    return ResponseModel(
        data=ClubOut.model_validate(club_management_service._build_club_out(club)).model_dump(),
        message="Club created successfully",
    )


@router.put("/{club_id}", response_model=ResponseModel)
async def update_club(
    club_id: UUID,
    data: ClubUpdate,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_super_admin),
):
    club = await club_management_service.update_club(db, club_id, data.model_dump(exclude_unset=True))
    return ResponseModel(
        data=ClubOut.model_validate(club_management_service._build_club_out(club)).model_dump(),
        message="Club updated successfully",
    )


@router.put("/{club_id}/status", response_model=ResponseModel)
async def toggle_club_status(
    club_id: UUID,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_super_admin),
):
    club = await club_management_service.toggle_club_status(db, club_id)
    return ResponseModel(
        data=ClubOut.model_validate(club_management_service._build_club_out(club)).model_dump(),
        message="Club status toggled successfully",
    )


@router.delete("/{club_id}", response_model=ResponseModel)
async def delete_club(
    club_id: UUID,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_super_admin),
):
    await club_management_service.delete_club(db, club_id)
    return ResponseModel(message="Club deleted successfully")


@router.post("/{club_id}/assign-admin", response_model=ResponseModel)
async def assign_club_admin(
    club_id: UUID,
    data: AssignAdminRequest,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_super_admin),
):
    club = await club_management_service.assign_club_admin(db, club_id, data.user_id)
    return ResponseModel(
        data=ClubOut.model_validate(club_management_service._build_club_out(club)).model_dump(),
        message="Club admin assigned successfully",
    )


@router.delete("/{club_id}/remove-admin", response_model=ResponseModel)
async def remove_club_admin(
    club_id: UUID,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_super_admin),
):
    club = await club_management_service.remove_club_admin(db, club_id)
    return ResponseModel(
        data=ClubOut.model_validate(club_management_service._build_club_out(club)).model_dump(),
        message="Club admin removed successfully",
    )

from uuid import UUID
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel
from app.dependencies import get_db, require_super_admin, require_club_admin, get_current_user
from app.models.user import User
from app.models.club import Club
from app.schemas.club import (
    ClubCreate, ClubUpdate, ClubOut, ClubDetailOut,
    ClubJoinRequestOut, ClubMemberOut, ClubJoinRequestAction,
)
from app.schemas.common import ResponseModel, PaginatedResponse
from app.services import club_management_service

router = APIRouter(prefix="/clubs", tags=["Clubs"])


class AssignAdminRequest(BaseModel):
    user_id: UUID


class JoinClubRequest(BaseModel):
    message: str | None = None


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
    category: str = Query(None),
    domain: str = Query(None),
    club_type: str = Query(None),
    department_id: UUID = Query(None),
    status: str = Query(None, alias="status"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    clubs, total = await club_management_service.list_clubs(
        db, search, category, domain, club_type, department_id, status, page, page_size
    )
    return PaginatedResponse(
        data=[ClubOut.model_validate(club_management_service._build_club_out(c)).model_dump() for c in clubs],
        total=total, page=page, page_size=page_size,
        has_next=(page * page_size) < total,
    )


@router.get("/my-clubs", response_model=ResponseModel)
async def get_my_clubs(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    clubs_data = await club_management_service.get_user_clubs(db, user.id)
    return ResponseModel(data=clubs_data)


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


@router.post("/{club_id}/join", response_model=ResponseModel)
async def join_club(
    club_id: UUID,
    data: JoinClubRequest = None,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    message = data.message if data else None
    req = await club_management_service.join_club(db, club_id, user, message)
    return ResponseModel(
        data=ClubJoinRequestOut.model_validate({
            "id": req.id,
            "club_id": req.club_id,
            "user_id": req.user_id,
            "status": req.status,
            "message": req.message,
            "created_at": req.created_at,
        }).model_dump(),
        message="Join request submitted successfully",
    )


@router.post("/{club_id}/leave", response_model=ResponseModel)
async def leave_club(
    club_id: UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    await club_management_service.leave_club(db, club_id, user)
    return ResponseModel(message="Left club successfully")


@router.get("/{club_id}/membership", response_model=ResponseModel)
async def get_membership(
    club_id: UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    membership = await club_management_service.get_user_club_membership(db, club_id, user.id)
    if membership:
        return ResponseModel(data={
            "is_member": True,
            "role": membership.role,
            "joined_at": membership.joined_at,
        })
    return ResponseModel(data={"is_member": False, "role": None})


@router.get("/{club_id}/join-requests", response_model=PaginatedResponse)
async def get_join_requests(
    club_id: UUID,
    status: str = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_club_admin),
):
    requests, total = await club_management_service.get_club_join_requests(
        db, club_id, status, page, page_size
    )
    data = [
        ClubJoinRequestOut(
            id=r.id,
            club_id=r.club_id,
            user_id=r.user_id,
            status=r.status,
            message=r.message,
            reviewed_by=r.reviewed_by,
            reviewed_at=r.reviewed_at,
            created_at=r.created_at,
            user_name=r.user.full_name if r.user else None,
            user_email=r.user.email if r.user else None,
            reviewer_name=r.reviewer.full_name if r.reviewer else None,
        ).model_dump()
        for r in requests
    ]
    return PaginatedResponse(
        data=data, total=total, page=page, page_size=page_size,
        has_next=(page * page_size) < total,
    )


@router.put("/join-requests/{request_id}", response_model=ResponseModel)
async def review_join_request(
    request_id: UUID,
    data: ClubJoinRequestAction,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_club_admin),
):
    req = await club_management_service.review_join_request(db, request_id, data.status, admin)
    return ResponseModel(
        message=f"Request {data.status} successfully",
    )


@router.get("/{club_id}/members", response_model=PaginatedResponse)
async def get_club_members(
    club_id: UUID,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_club_admin),
):
    members, total = await club_management_service.get_club_members(db, club_id, page, page_size)
    data = [
        ClubMemberOut(
            id=m.id,
            club_id=m.club_id,
            user_id=m.user_id,
            role=m.role,
            joined_at=m.joined_at,
            user_name=m.user.full_name if m.user else None,
            user_email=m.user.email if m.user else None,
            user_avatar=m.user.avatar_url if m.user else None,
        ).model_dump()
        for m in members
    ]
    return PaginatedResponse(
        data=data, total=total, page=page, page_size=page_size,
        has_next=(page * page_size) < total,
    )


@router.delete("/{club_id}/members/{user_id}", response_model=ResponseModel)
async def remove_member(
    club_id: UUID,
    user_id: UUID,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_club_admin),
):
    await club_management_service.remove_club_member(db, club_id, user_id)
    return ResponseModel(message="Member removed successfully")


@router.get("/{club_id}/dashboard", response_model=ResponseModel)
async def club_dashboard(
    club_id: UUID,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_club_admin),
):
    data = await club_management_service.get_club_dashboard(db, club_id)
    return ResponseModel(data=data)


@router.get("/department/{department_id}", response_model=ResponseModel)
async def get_department_clubs(
    department_id: UUID,
    db: AsyncSession = Depends(get_db),
):
    clubs, total = await club_management_service.list_clubs(
        db, department_id=department_id, page_size=100
    )
    return ResponseModel(
        data=[ClubOut.model_validate(club_management_service._build_club_out(c)).model_dump() for c in clubs],
    )

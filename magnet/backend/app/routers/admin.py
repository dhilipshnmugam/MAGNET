from uuid import UUID
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.dependencies import get_db, require_super_admin
from app.models.user import User
from app.schemas.user import UserOut, RoleUpdate, AccountStatusUpdate
from app.schemas.approval import ApprovalRequestOut, ApprovalReview
from app.schemas.common import ResponseModel, PaginatedResponse
from app.services import admin_service, user_service

router = APIRouter(prefix="/admin", tags=["Admin"])


@router.get("/dashboard", response_model=ResponseModel)
async def dashboard(db: AsyncSession = Depends(get_db), admin: User = Depends(require_super_admin)):
    stats = await admin_service.get_dashboard_stats(db)
    return ResponseModel(data=stats)


@router.get("/users", response_model=PaginatedResponse)
async def list_users(
    search: str = Query(None),
    role: str = Query(None),
    is_active: bool = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_super_admin),
):
    users, total = await admin_service.list_all_users(db, search, role, is_active, page, page_size)
    return PaginatedResponse(
        data=[UserOut.model_validate(u).model_dump() for u in users],
        total=total, page=page, page_size=page_size,
        has_next=(page * page_size) < total,
    )


@router.put("/users/{user_id}/role", response_model=ResponseModel)
async def change_role(
    user_id: UUID, data: RoleUpdate,
    db: AsyncSession = Depends(get_db), admin: User = Depends(require_super_admin)
):
    user = await user_service.change_user_role(db, user_id, data.role, admin)
    return ResponseModel(data=UserOut.model_validate(user).model_dump(), message="Role updated")


@router.put("/users/{user_id}/status", response_model=ResponseModel)
async def change_status(
    user_id: UUID, data: AccountStatusUpdate,
    db: AsyncSession = Depends(get_db), admin: User = Depends(require_super_admin)
):
    user = await user_service.toggle_user_status(db, user_id, data.is_active, admin)
    return ResponseModel(data=UserOut.model_validate(user).model_dump(), message="Status updated")


@router.delete("/users/{user_id}", response_model=ResponseModel)
async def delete_user(user_id: UUID, db: AsyncSession = Depends(get_db), admin: User = Depends(require_super_admin)):
    await user_service.delete_user(db, user_id, admin)
    return ResponseModel(message="User deleted")


@router.get("/channels", response_model=PaginatedResponse)
async def list_channels(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_super_admin),
):
    channels, total = await admin_service.list_all_channels(db, page, page_size)
    return PaginatedResponse(
        data=[{"id": str(c.id), "name": c.name, "type": c.type, "member_count": c.member_count} for c in channels],
        total=total, page=page, page_size=page_size,
        has_next=(page * page_size) < total,
    )


@router.get("/approvals", response_model=PaginatedResponse)
async def list_approvals(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_super_admin),
):
    requests, total = await admin_service.get_pending_approvals(db, page, page_size)
    return PaginatedResponse(
        data=[ApprovalRequestOut.model_validate(r).model_dump() for r in requests],
        total=total, page=page, page_size=page_size,
        has_next=(page * page_size) < total,
    )


@router.put("/approvals/{request_id}", response_model=ResponseModel)
async def review_approval(
    request_id: UUID, data: ApprovalReview,
    db: AsyncSession = Depends(get_db), admin: User = Depends(require_super_admin)
):
    request = await admin_service.review_approval(db, request_id, admin, data.status, data.review_note)
    return ResponseModel(data=ApprovalRequestOut.model_validate(request).model_dump(), message="Request reviewed")

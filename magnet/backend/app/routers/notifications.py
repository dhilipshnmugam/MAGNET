from fastapi import APIRouter, Depends, Query
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from app.dependencies import get_db, get_current_user
from app.models.user import User
from app.schemas.notification import (
    NotificationOut, FCMTokenRegister, NotificationPrefsOut,
    NotificationPrefsUpdate, UnreadCountOut
)
from app.schemas.common import ResponseModel, PaginatedResponse
from app.services import notification_service

router = APIRouter(prefix="/notifications", tags=["Notifications"])


@router.get("", response_model=PaginatedResponse)
@router.get("/", response_model=PaginatedResponse)
async def get_notifications(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    unread_only: bool = Query(False),
    type: str = Query(None),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    notifications, total = await notification_service.get_notifications(
        db, user, page, page_size, unread_only=unread_only, notif_type=type
    )
    return PaginatedResponse(
        data=[NotificationOut.model_validate(n).model_dump() for n in notifications],
        total=total, page=page, page_size=page_size,
        has_next=(page * page_size) < total,
    )


@router.get("/unread-count", response_model=ResponseModel)
async def get_unread_count(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    count = await notification_service.get_unread_count(db, user)
    return ResponseModel(data={"count": count})


@router.put("/{notification_id}/read", response_model=ResponseModel)
async def mark_read(
    notification_id: UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    success = await notification_service.mark_notification_read(db, notification_id, user)
    if not success:
        return ResponseModel(message="Notification not found")
    return ResponseModel(message="Marked as read")


@router.put("/read-all", response_model=ResponseModel)
async def mark_all_read(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    await notification_service.mark_all_read(db, user)
    return ResponseModel(message="All notifications marked as read")


@router.post("/fcm-token", response_model=ResponseModel)
async def register_fcm(
    data: FCMTokenRegister,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    await notification_service.register_fcm_token(db, user, data.token, data.device_info)
    return ResponseModel(message="FCM token registered")


@router.delete("/fcm-token", response_model=ResponseModel)
async def remove_fcm(
    data: FCMTokenRegister,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    await notification_service.remove_fcm_token(db, user, data.token)
    return ResponseModel(message="FCM token removed")


@router.get("/preferences", response_model=ResponseModel)
async def get_prefs(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    prefs = await notification_service.get_notification_prefs(db, user)
    return ResponseModel(data=NotificationPrefsOut.model_validate(prefs).model_dump())


@router.put("/preferences", response_model=ResponseModel)
async def update_prefs(
    data: NotificationPrefsUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    prefs = await notification_service.update_notification_prefs(
        db, user, data.model_dump(exclude_unset=True)
    )
    return ResponseModel(
        data=NotificationPrefsOut.model_validate(prefs).model_dump(),
        message="Preferences updated",
    )

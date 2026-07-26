from uuid import UUID
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.dependencies import get_db, get_current_user, require_staff
from app.models.user import User
from app.schemas.channel import (
    ChannelCreate, ChannelUpdate, ChannelOut, ChannelMemberOut,
    ChannelMessageCreate, ChannelMessageOut
)
from app.schemas.common import ResponseModel, PaginatedResponse
from app.services import channel_service

router = APIRouter(prefix="/channels", tags=["Channels"])


@router.post("/", response_model=ResponseModel, status_code=201)
async def create_channel(data: ChannelCreate, db: AsyncSession = Depends(get_db), user: User = Depends(require_staff)):
    channel = await channel_service.create_channel(db, user, data)
    return ResponseModel(data=ChannelOut.model_validate(channel).model_dump(), message="Channel created")


@router.get("/", response_model=PaginatedResponse)
async def list_channels(
    search: str = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    channels, total = await channel_service.list_channels(db, user, search, page, page_size)
    return PaginatedResponse(
        data=[ChannelOut.model_validate(c).model_dump() for c in channels],
        total=total, page=page, page_size=page_size,
        has_next=(page * page_size) < total,
    )


@router.get("/{channel_id}", response_model=ResponseModel)
async def get_channel(channel_id: UUID, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    channel = await channel_service.get_channel_by_id(db, channel_id, user)
    return ResponseModel(data=ChannelOut.model_validate(channel).model_dump())


@router.put("/{channel_id}", response_model=ResponseModel)
async def update_channel(
    channel_id: UUID, data: ChannelUpdate,
    db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)
):
    channel = await channel_service.update_channel(db, channel_id, user, data)
    return ResponseModel(data=ChannelOut.model_validate(channel).model_dump(), message="Channel updated")


@router.delete("/{channel_id}", response_model=ResponseModel)
async def delete_channel(channel_id: UUID, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    await channel_service.delete_channel(db, channel_id, user)
    return ResponseModel(message="Channel deleted")


@router.post("/{channel_id}/join", response_model=ResponseModel)
async def join_channel(channel_id: UUID, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    member = await channel_service.join_channel(db, channel_id, user)
    return ResponseModel(message="Joined channel")


@router.post("/{channel_id}/leave", response_model=ResponseModel)
async def leave_channel(channel_id: UUID, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    await channel_service.leave_channel(db, channel_id, user)
    return ResponseModel(message="Left channel")


@router.get("/{channel_id}/members", response_model=ResponseModel)
async def get_members(channel_id: UUID, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    members = await channel_service.get_channel_members(db, channel_id, user)
    return ResponseModel(data=[ChannelMemberOut.model_validate(m).model_dump() for m in members])


@router.post("/{channel_id}/members/{user_id}", response_model=ResponseModel)
async def add_member(
    channel_id: UUID, user_id: UUID,
    db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)
):
    await channel_service.add_channel_member(db, channel_id, user_id, user)
    return ResponseModel(message="Member added")


@router.delete("/{channel_id}/members/{user_id}", response_model=ResponseModel)
async def remove_member(
    channel_id: UUID, user_id: UUID,
    db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)
):
    await channel_service.remove_channel_member(db, channel_id, user_id, user)
    return ResponseModel(message="Member removed")


@router.get("/{channel_id}/messages", response_model=PaginatedResponse)
async def get_channel_messages(
    channel_id: UUID,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    messages, total = await channel_service.get_channel_messages(db, channel_id, user, page, page_size)
    return PaginatedResponse(
        data=[ChannelMessageOut.model_validate(m).model_dump() for m in reversed(messages)],
        total=total, page=page, page_size=page_size,
        has_next=(page * page_size) < total,
    )


@router.post("/{channel_id}/messages", response_model=ResponseModel, status_code=201)
async def send_channel_message(
    channel_id: UUID, data: ChannelMessageCreate,
    db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)
):
    message = await channel_service.send_channel_message(db, channel_id, user, data)
    return ResponseModel(data=ChannelMessageOut.model_validate(message).model_dump(), message="Message sent")

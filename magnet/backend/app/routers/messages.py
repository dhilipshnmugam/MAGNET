from uuid import UUID
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.dependencies import get_db, get_current_user
from app.models.user import User
from app.schemas.message import MessageCreate, MessageOut, ConversationOut
from app.schemas.common import ResponseModel, PaginatedResponse
from app.services import message_service

router = APIRouter(prefix="/messages", tags=["Messages"])


@router.get("/conversations", response_model=ResponseModel)
async def get_conversations(db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    conversations = await message_service.get_conversations(db, user)
    return ResponseModel(data=conversations)


@router.get("/conversations/{user_id}", response_model=PaginatedResponse)
async def get_conversation_messages(
    user_id: UUID,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    messages, total = await message_service.get_conversation_messages(db, user, user_id, page, page_size)
    return PaginatedResponse(
        data=[MessageOut.model_validate(m).model_dump() for m in reversed(messages)],
        total=total, page=page, page_size=page_size,
        has_next=(page * page_size) < total,
    )


@router.post("/", response_model=ResponseModel, status_code=201)
async def send_message(data: MessageCreate, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    message = await message_service.send_message(db, user, data.receiver_id, data.content, data.image_url)
    return ResponseModel(data=MessageOut.model_validate(message).model_dump(), message="Message sent")


@router.put("/{message_id}/read", response_model=ResponseModel)
async def mark_read(message_id: UUID, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    await message_service.mark_message_read(db, message_id, user)
    return ResponseModel(message="Marked as read")


@router.delete("/{message_id}", response_model=ResponseModel)
async def delete_message(message_id: UUID, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    await message_service.delete_message(db, message_id, user)
    return ResponseModel(message="Message deleted")

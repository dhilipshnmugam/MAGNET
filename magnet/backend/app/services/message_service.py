from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_, and_
from sqlalchemy.orm import selectinload
from fastapi import HTTPException, status
from app.models.message import DirectMessage
from app.models.user import User


async def send_message(db: AsyncSession, sender: User, receiver_id: UUID, content: str = None, image_url: str = None) -> DirectMessage:
    if sender.id == receiver_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot message yourself")

    receiver = await db.execute(select(User).where(User.id == receiver_id))
    if not receiver.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Receiver not found")

    if not content and not image_url:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Message must have content or image")

    message = DirectMessage(
        sender_id=sender.id,
        receiver_id=receiver_id,
        content=content,
        image_url=image_url,
    )
    db.add(message)
    await db.flush()
    return message


async def get_conversations(db: AsyncSession, user: User) -> list[dict]:
    subq = (
        select(
            func.max(DirectMessage.created_at).label("last_msg_time"),
            func.bool_or(DirectMessage.is_read == False).label("has_unread"),
        )
        .where(
            or_(
                DirectMessage.sender_id == user.id,
                DirectMessage.receiver_id == user.id,
            ),
            DirectMessage.is_deleted == False,
        )
        .group_by(
            func.least(DirectMessage.sender_id, DirectMessage.receiver_id),
            func.greatest(DirectMessage.sender_id, DirectMessage.receiver_id),
        )
    ).subquery()

    query = (
        select(
            func.least(DirectMessage.sender_id, DirectMessage.receiver_id).label("conv_user_id"),
            func.max(DirectMessage.created_at).label("last_msg_time"),
        )
        .where(
            or_(
                DirectMessage.sender_id == user.id,
                DirectMessage.receiver_id == user.id,
            ),
            DirectMessage.is_deleted == False,
        )
        .group_by(
            func.least(DirectMessage.sender_id, DirectMessage.receiver_id),
            func.greatest(DirectMessage.sender_id, DirectMessage.receiver_id),
        )
        .order_by(func.max(DirectMessage.created_at).desc())
    )

    result = await db.execute(query)
    conversations = []

    for row in result.all():
        other_user_id = row[0] if row[0] != user.id else row[1]

        user_result = await db.execute(select(User).where(User.id == other_user_id))
        other_user = user_result.scalar_one_or_none()
        if not other_user:
            continue

        last_msg_result = await db.execute(
            select(DirectMessage)
            .where(
                or_(
                    and_(DirectMessage.sender_id == user.id, DirectMessage.receiver_id == other_user_id),
                    and_(DirectMessage.sender_id == other_user_id, DirectMessage.receiver_id == user.id),
                ),
                DirectMessage.is_deleted == False,
            )
            .order_by(DirectMessage.created_at.desc())
            .limit(1)
        )
        last_msg = last_msg_result.scalar_one_or_none()

        unread_result = await db.execute(
            select(func.count()).select_from(DirectMessage).where(
                DirectMessage.sender_id == other_user_id,
                DirectMessage.receiver_id == user.id,
                DirectMessage.is_read == False,
                DirectMessage.is_deleted == False,
            )
        )
        unread_count = unread_result.scalar()

        conversations.append({
            "other_user_id": other_user.id,
            "other_user_name": other_user.full_name,
            "other_user_avatar": other_user.avatar_url,
            "last_message": last_msg.content if last_msg else None,
            "last_message_at": last_msg.created_at if last_msg else None,
            "unread_count": unread_count,
        })

    return conversations


async def get_conversation_messages(
    db: AsyncSession, user: User, other_user_id: UUID,
    page: int = 1, page_size: int = 50
) -> tuple[list[DirectMessage], int]:
    query = (
        select(DirectMessage)
        .where(
            or_(
                and_(DirectMessage.sender_id == user.id, DirectMessage.receiver_id == other_user_id),
                and_(DirectMessage.sender_id == other_user_id, DirectMessage.receiver_id == user.id),
            ),
            DirectMessage.is_deleted == False,
        )
        .order_by(DirectMessage.created_at.desc())
    )

    count_q = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_q)).scalar()

    query = query.offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(query)
    messages = list(result.scalars().all())

    unread_update = await db.execute(
        select(DirectMessage).where(
            DirectMessage.sender_id == other_user_id,
            DirectMessage.receiver_id == user.id,
            DirectMessage.is_read == False,
        )
    )
    for msg in unread_update.scalars().all():
        msg.is_read = True

    await db.flush()
    return messages, total


async def mark_message_read(db: AsyncSession, message_id: UUID, user: User) -> bool:
    result = await db.execute(
        select(DirectMessage).where(
            DirectMessage.id == message_id,
            DirectMessage.receiver_id == user.id,
        )
    )
    message = result.scalar_one_or_none()
    if not message:
        return False

    message.is_read = True
    await db.flush()
    return True


async def delete_message(db: AsyncSession, message_id: UUID, user: User) -> bool:
    result = await db.execute(
        select(DirectMessage).where(
            DirectMessage.id == message_id,
            DirectMessage.sender_id == user.id,
        )
    )
    message = result.scalar_one_or_none()
    if not message:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Message not found")

    message.is_deleted = True
    await db.flush()
    return True

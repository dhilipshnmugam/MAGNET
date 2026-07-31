import json
import logging
from datetime import datetime, timedelta
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import select, func, or_, and_, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.message import (
    DirectMessage, Conversation, ConversationParticipant,
    MessageAttachment, MessageReaction, BlockedUser,
)
from app.models.user import User
from app.models.post import Post
from app.models.event import Event
from app.models.club import Club
from app.models.department import Department

logger = logging.getLogger("magnet.messages")

ALLOWED_MESSAGE_TYPES = {
    "text", "emoji", "image", "video", "audio", "file", "gif",
    "link", "post", "profile", "event", "club", "department",
}


# ══════════════════════════════════════════════════════════════════════
#  SERIALIZATION
# ══════════════════════════════════════════════════════════════════════

def _parse_json(value):
    if value is None:
        return None
    if isinstance(value, dict):
        return value
    try:
        return json.loads(value)
    except (ValueError, TypeError):
        return None


async def _reply_preview(db: AsyncSession, reply_to_id: UUID | None) -> dict | None:
    if not reply_to_id:
        return None
    result = await db.execute(
        select(DirectMessage).where(DirectMessage.id == reply_to_id)
    )
    msg = result.scalar_one_or_none()
    if not msg or msg.is_deleted:
        return None
    sender = await db.get(User, msg.sender_id)
    return {
        "id": str(msg.id),
        "content": (msg.content or "")[:200],
        "message_type": msg.message_type,
        "sender_name": sender.full_name if sender else "Unknown",
        "image_url": msg.image_url,
        "created_at": msg.created_at.isoformat() if msg.created_at else None,
    }


async def serialize_message(db: AsyncSession, msg: DirectMessage, current_user: User) -> dict:
    deleted_for = msg.deleted_for_ids
    if msg.is_deleted or current_user.id in deleted_for:
        return {
            "id": str(msg.id),
            "sender_id": str(msg.sender_id),
            "receiver_id": str(msg.receiver_id),
            "conversation_id": str(msg.conversation_id) if msg.conversation_id else None,
            "content": None,
            "image_url": None,
            "message_type": "deleted",
            "reply_to_id": str(msg.reply_to_id) if msg.reply_to_id else None,
            "is_forwarded": False,
            "is_edited": False,
            "is_starred": False,
            "is_pinned": False,
            "is_read": msg.is_read,
            "is_deleted": True,
            "deleted_for_me": current_user.id in deleted_for,
            "share_type": None,
            "share_id": None,
            "share_preview": None,
            "link_title": None,
            "link_description": None,
            "link_image": None,
            "delivered_at": msg.delivered_at.isoformat() if msg.delivered_at else None,
            "created_at": msg.created_at.isoformat() if msg.created_at else None,
            "attachments": [],
            "reactions": [],
            "reply_to": None,
        }

    att_result = await db.execute(
        select(MessageAttachment).where(MessageAttachment.message_id == msg.id)
    )
    attachments = [
        {
            "id": str(a.id),
            "file_type": a.file_type,
            "file_url": a.file_url,
            "file_name": a.file_name,
            "file_size": a.file_size,
            "mime_type": a.mime_type,
            "duration": a.duration,
            "width": a.width,
            "height": a.height,
        }
        for a in att_result.scalars().all()
    ]

    react_result = await db.execute(
        select(MessageReaction).where(MessageReaction.message_id == msg.id)
    )
    reactions = [
        {"id": str(r.id), "user_id": str(r.user_id), "emoji": r.emoji}
        for r in react_result.scalars().all()
    ]

    reply = await _reply_preview(db, msg.reply_to_id)

    return {
        "id": str(msg.id),
        "sender_id": str(msg.sender_id),
        "receiver_id": str(msg.receiver_id),
        "conversation_id": str(msg.conversation_id) if msg.conversation_id else None,
        "content": msg.content,
        "image_url": msg.image_url,
        "message_type": msg.message_type,
        "reply_to_id": str(msg.reply_to_id) if msg.reply_to_id else None,
        "forwarded_from_id": str(msg.forwarded_from_id) if msg.forwarded_from_id else None,
        "is_forwarded": msg.is_forwarded,
        "is_edited": msg.is_edited,
        "is_starred": msg.is_starred,
        "is_pinned": msg.is_pinned,
        "is_read": msg.is_read,
        "is_deleted": msg.is_deleted,
        "deleted_for_me": False,
        "share_type": msg.share_type,
        "share_id": str(msg.share_id) if msg.share_id else None,
        "share_preview": _parse_json(msg.share_preview),
        "link_title": msg.link_title,
        "link_description": msg.link_description,
        "link_image": msg.link_image,
        "delivered_at": msg.delivered_at.isoformat() if msg.delivered_at else None,
        "edited_at": msg.edited_at.isoformat() if msg.edited_at else None,
        "created_at": msg.created_at.isoformat() if msg.created_at else None,
        "attachments": attachments,
        "reactions": reactions,
        "reply_to": reply,
    }


async def _other_user(db: AsyncSession, conversation: Conversation, user_id: UUID) -> User | None:
    result = await db.execute(
        select(ConversationParticipant.user_id).where(
            ConversationParticipant.conversation_id == conversation.id,
            ConversationParticipant.user_id != user_id,
        ).limit(1)
    )
    other_id = result.scalar_one_or_none()
    if not other_id:
        return None
    other = await db.execute(select(User).where(User.id == other_id))
    return other.scalar_one_or_none()


async def _user_online(uuid_str) -> bool:
    try:
        from app.websockets.connection_manager import manager
        return manager.is_online(str(uuid_str))
    except Exception:
        return False


# ══════════════════════════════════════════════════════════════════════
#  BLOCKING
# ══════════════════════════════════════════════════════════════════════

async def is_blocked(db: AsyncSession, user_a: UUID, user_b: UUID) -> bool:
    result = await db.execute(
        select(BlockedUser.id).where(
            or_(
                and_(BlockedUser.blocker_id == user_a, BlockedUser.blocked_id == user_b),
                and_(BlockedUser.blocker_id == user_b, BlockedUser.blocked_id == user_a),
            )
        ).limit(1)
    )
    return result.scalar_one_or_none() is not None


async def get_blocked_users(db: AsyncSession, user: User) -> list[str]:
    result = await db.execute(
        select(BlockedUser.blocked_id).where(BlockedUser.blocker_id == user.id)
    )
    return [str(r[0]) for r in result.all()]


async def block_user(db: AsyncSession, user: User, other_user_id: UUID) -> bool:
    if user.id == other_user_id:
        raise HTTPException(status_code=400, detail="You cannot block yourself")
    other = await db.get(User, other_user_id)
    if not other:
        raise HTTPException(status_code=404, detail="User not found")

    result = await db.execute(
        select(BlockedUser).where(
            BlockedUser.blocker_id == user.id,
            BlockedUser.blocked_id == other_user_id,
        )
    )
    if not result.scalar_one_or_none():
        db.add(BlockedUser(blocker_id=user.id, blocked_id=other_user_id))
        await db.flush()
    return True


async def unblock_user(db: AsyncSession, user: User, other_user_id: UUID) -> bool:
    result = await db.execute(
        select(BlockedUser).where(
            BlockedUser.blocker_id == user.id,
            BlockedUser.blocked_id == other_user_id,
        )
    )
    block = result.scalar_one_or_none()
    if block:
        await db.delete(block)
        await db.flush()
    return True


# ══════════════════════════════════════════════════════════════════════
#  CONVERSATIONS
# ══════════════════════════════════════════════════════════════════════

async def get_or_create_conversation(db: AsyncSession, user_a: UUID, user_b: UUID) -> Conversation:
    if user_a == user_b:
        raise HTTPException(status_code=400, detail="Cannot message yourself")

    # find existing conversation
    cp_alias_a = select(ConversationParticipant.conversation_id).where(
        ConversationParticipant.user_id == user_a
    )
    cp_alias_b = select(ConversationParticipant.conversation_id).where(
        ConversationParticipant.user_id == user_b
    )
    result = await db.execute(
        select(Conversation).where(
            Conversation.id.in_(cp_alias_a),
            Conversation.id.in_(cp_alias_b),
        ).options()  # lazy participants via relationship
    )
    conversation = result.scalars().first()
    if conversation:
        return conversation

    conversation = Conversation()
    db.add(conversation)
    await db.flush()
    await db.refresh(conversation)
    db.add(ConversationParticipant(conversation_id=conversation.id, user_id=user_a))
    db.add(ConversationParticipant(conversation_id=conversation.id, user_id=user_b))
    await db.flush()
    return conversation


async def get_conversations(
    db: AsyncSession, user: User, search: str = None, filter: str = None
) -> list[dict]:
    """List conversations with the other user, last message, unread, pin/archive/mute state."""
    from app.websockets.connection_manager import manager

    cp_result = await db.execute(
        select(ConversationParticipant)
        .where(ConversationParticipant.user_id == user.id)
        .order_by(ConversationParticipant.is_pinned.desc())
    )
    my_participations = cp_result.scalars().all()

    conv_ids = [p.conversation_id for p in my_participations]
    if not conv_ids:
        return []

    conversations = await db.execute(
        select(Conversation).where(Conversation.id.in_(conv_ids)).order_by(Conversation.updated_at.desc())
    )
    conversations = conversations.scalars().all()
    conv_map = {c.id: c for c in conversations}

    conv_user_ids = [p.user_id for p in my_participations]
    users_result = await db.execute(select(User).where(User.id.in_(conv_user_ids)))
    users = users_result.scalars().all()
    user_map = {u.id: u for u in users}

    dept_ids = {u.department_id for u in users if u.department_id}
    dept_map = {}
    if dept_ids:
        dept_result = await db.execute(
            select(Department).where(Department.id.in_(dept_ids))
        )
        dept_map = {d.id: d for d in dept_result.scalars().all()}

    # batch last messages
    last_msg_result = await db.execute(
        select(
            DirectMessage.conversation_id,
            DirectMessage.content,
            DirectMessage.message_type,
            DirectMessage.created_at,
            DirectMessage.sender_id,
        )
        .where(
            DirectMessage.conversation_id.in_(conv_ids),
            DirectMessage.is_deleted == False,
        )
        .order_by(DirectMessage.created_at.desc())
    )
    last_msg_map = {}
    for conv_id, content, mtype, created_at, sender_id in last_msg_result.all():
        if conv_id not in last_msg_map:
            last_msg_map[conv_id] = (content, mtype, created_at, sender_id)

    # batch unread counts
    unread_result = await db.execute(
        select(
            DirectMessage.conversation_id,
            func.count(),
        )
        .where(
            DirectMessage.conversation_id.in_(conv_ids),
            DirectMessage.receiver_id == user.id,
            DirectMessage.is_read == False,
            DirectMessage.is_deleted == False,
        )
        .group_by(DirectMessage.conversation_id)
    )
    unread_map = {row[0]: row[1] for row in unread_result.all()}

    participations_by_conv = {}
    for p in my_participations:
        participations_by_conv[p.conversation_id] = p

    results = []
    for conv_id in conv_ids:
        conv = conv_map.get(conv_id)
        other = await _other_user(db, conv, user.id) if conv else None
        if not other:
            continue

        other_dept = dept_map.get(other.department_id)
        last = last_msg_map.get(conv_id)
        my_p = participations_by_conv.get(conv_id)

        is_online = manager.is_online(str(other.id))

        if search:
            haystack = " ".join([
                other.full_name or "",
                other.register_number or "",
                other.email or "",
                (other_dept.name if other_dept else "") or "",
                (other_dept.code if other_dept else "") or "",
            ]).lower()
            if search.lower() not in haystack:
                continue

        if filter == "pinned" and not (my_p and my_p.is_pinned):
            continue
        if filter == "archived":
            if not (my_p and my_p.is_archived):
                continue
        elif filter == "unread":
            if not (unread_map.get(conv_id, 0) > 0):
                continue

        results.append({
            "conversation_id": str(conv_id),
            "other_user_id": str(other.id),
            "other_user_name": other.full_name,
            "other_user_avatar": other.avatar_url,
            "other_user_role": other.role,
            "other_user_register_number": other.register_number,
            "other_user_department": other_dept.name if other_dept else None,
            "last_message": last[0] if last else None,
            "last_message_type": last[1] if last else None,
            "last_message_at": last[2] if last else None,
            "unread_count": unread_map.get(conv_id, 0),
            "is_pinned": bool(my_p and my_p.is_pinned),
            "is_archived": bool(my_p and my_p.is_archived),
            "is_muted": bool(my_p and my_p.is_muted),
            "is_online": is_online,
            "last_seen_at": other.last_seen_at,
        })

    results.sort(key=lambda c: (not c["is_pinned"], c["last_message_at"] or datetime.min), reverse=True)
    results.sort(key=lambda c: (c["is_archived"], not c["is_pinned"]))
    return results


async def get_conversation_messages(
    db: AsyncSession, user: User, other_user_id: UUID,
    page: int = 1, page_size: int = 50,
) -> tuple[list[dict], int, Conversation]:
    conversation = await get_or_create_conversation(db, user.id, other_user_id)

    base = select(DirectMessage).where(
        DirectMessage.conversation_id == conversation.id,
    )
    count_q = select(func.count()).select_from(base.subquery())
    total = (await db.execute(count_q)).scalar() or 0

    query = (
        base
        .order_by(DirectMessage.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    result = await db.execute(query)
    messages = list(result.scalars().all())
    messages.reverse()

    serialized = [await serialize_message(db, m, user) for m in messages]

    await mark_conversation_read(db, user, conversation.id)
    return serialized, total, conversation


async def mark_conversation_read(db: AsyncSession, user: User, conversation_id: UUID) -> bool:
    now = datetime.utcnow()
    result = await db.execute(
        select(DirectMessage).where(
            DirectMessage.conversation_id == conversation_id,
            DirectMessage.receiver_id == user.id,
            DirectMessage.is_read == False,
        )
    )
    messages = result.scalars().all()
    for m in messages:
        m.is_read = True
        m.delivered_at = m.delivered_at or now
    if messages:
        await db.flush()

    cp_result = await db.execute(
        select(ConversationParticipant).where(
            ConversationParticipant.conversation_id == conversation_id,
            ConversationParticipant.user_id == user.id,
        )
    )
    my_p = cp_result.scalar_one_or_none()
    if my_p:
        my_p.last_read_at = now
        await db.flush()
    return True


# ══════════════════════════════════════════════════════════════════════
#  SENDING / MESSAGES
# ══════════════════════════════════════════════════════════════════════

async def _push_ws(user_id: UUID, payload: dict):
    try:
        from app.websockets.connection_manager import manager
        await manager.send_to_user(str(user_id), payload)
    except Exception as e:
        logger.warning(f"WS push failed: {e}")


async def send_message(db: AsyncSession, sender: User, receiver_id: UUID, payload: dict) -> dict:
    if sender.id == receiver_id:
        raise HTTPException(status_code=400, detail="Cannot message yourself")

    receiver = await db.get(User, receiver_id)
    if not receiver:
        raise HTTPException(status_code=404, detail="Receiver not found")

    if await is_blocked(db, sender.id, receiver_id):
        raise HTTPException(status_code=403, detail="You cannot send messages to this user")
    if await is_blocked(db, receiver_id, sender.id):
        raise HTTPException(status_code=403, detail="This user has blocked you")

    content = (payload.get("content") or "").strip() if isinstance(payload.get("content"), str) else payload.get("content")
    image_url = payload.get("image_url")
    message_type = (payload.get("message_type") or "text").lower()
    if message_type not in ALLOWED_MESSAGE_TYPES:
        message_type = "text"

    share_type = payload.get("share_type")
    share_id = payload.get("share_id")

    has_content = bool(content) or bool(image_url)
    has_share = bool(share_type and share_id)
    if not has_content and not has_share:
        raise HTTPException(status_code=400, detail="Message must have content, image, or share")

    conversation = await get_or_create_conversation(db, sender.id, receiver_id)

    message = DirectMessage(
        conversation_id=conversation.id,
        sender_id=sender.id,
        receiver_id=receiver_id,
        content=content,
        image_url=image_url,
        message_type=message_type,
        reply_to_id=payload.get("reply_to_id"),
        forwarded_from_id=payload.get("forwarded_from_id"),
        is_forwarded=bool(payload.get("is_forwarded")),
        share_type=share_type,
        share_id=share_id,
    )

    if share_type and share_id:
        message.share_preview = await _build_share_preview(db, share_type, share_id, message)

    if message_type == "link" and content:
        # best-effort link preview metadata (may be filled by router for remote fetch)
        pass

    db.add(message)
    await db.flush()

    attachments = payload.get("attachments") or []
    for att in attachments[:10]:
        db.add(MessageAttachment(
            message_id=message.id,
            file_type=att.get("file_type") or "file",
            file_url=att.get("file_url") or "",
            file_name=att.get("file_name"),
            file_size=att.get("file_size"),
            mime_type=att.get("mime_type"),
            duration=att.get("duration"),
            width=att.get("width"),
            height=att.get("height"),
        ))

    conversation.updated_at = datetime.utcnow()

    # delivered immediately if receiver is online
    from app.websockets.connection_manager import manager
    if manager.is_online(str(receiver_id)):
        message.delivered_at = message.delivered_at or datetime.utcnow()

    await db.commit()
    await db.refresh(message)

    serialized = await serialize_message(db, message, sender)

    # push to receiver
    await _push_ws(receiver_id, {"type": "new_message", "message": serialized})
    # notify receiver (if not muted)
    cp_result = await db.execute(
        select(ConversationParticipant).where(
            ConversationParticipant.conversation_id == conversation.id,
            ConversationParticipant.user_id == receiver_id,
        )
    )
    recv_p = cp_result.scalar_one_or_none()
    if not (recv_p and recv_p.is_muted):
        try:
            from app.services.notification_service import create_notification
            await create_notification(
                db, receiver_id, "message",
                title="New Message",
                body=f"{sender.full_name}: {(content or 'Shared an item')[:120]}",
                ref_type="message", ref_id=message.id,
                sender_id=sender.id, sender_name=sender.full_name, sender_avatar=sender.avatar_url,
                send_push=True,
            )
        except Exception as e:
            logger.warning(f"Notification create failed: {e}")
    await db.commit()

    return serialized


async def _build_share_preview(db: AsyncSession, share_type: str, share_id: UUID, message: DirectMessage) -> str:
    preview = None
    if share_type == "post":
        result = await db.execute(select(Post).where(Post.id == share_id))
        post = result.scalar_one_or_none()
        if post:
            author = await db.get(User, post.author_id)
            media_urls = []
            try:
                from app.models.post import PostMedia
                m_result = await db.execute(
                    select(PostMedia).where(PostMedia.post_id == post.id).order_by(PostMedia.sort_order)
                )
                media_urls = [m.media_url for m in m_result.scalars().all()][:4]
            except Exception:
                media_urls = []
            if not media_urls and post.image_url:
                media_urls = [post.image_url]
            preview = {
                "post_id": str(post.id),
                "content": post.content[:300],
                "author_name": author.full_name if author else "Unknown",
                "author_avatar": author.avatar_url if author else None,
                "image_url": media_urls[0] if media_urls else None,
                "media_urls": media_urls,
                "like_count": post.like_count or 0,
                "comment_count": post.comment_count or 0,
                "post_type": post.post_type,
            }
            if not message.content:
                message.content = f"[{post.post_type.replace('_', ' ').title()}]"
    elif share_type == "profile":
        target = await db.get(User, share_id)
        if target:
            preview = {
                "user_id": str(target.id),
                "full_name": target.full_name,
                "avatar_url": target.avatar_url,
                "role": target.role,
                "register_number": target.register_number,
            }
            if not message.content:
                message.content = "[Profile]"
    elif share_type == "event":
        result = await db.execute(select(Event).where(Event.id == share_id))
        event = result.scalar_one_or_none()
        if event:
            preview = {
                "event_id": str(event.id),
                "title": event.title,
                "description": (event.description or "")[:300],
                "event_date": event.event_date.isoformat() if event.event_date else None,
                "location": event.location,
                "image_url": event.image_url,
                "event_type": event.event_type,
            }
            if not message.content:
                message.content = "[Event]"
    elif share_type == "club":
        result = await db.execute(select(Club).where(Club.id == share_id))
        club = result.scalar_one_or_none()
        if club:
            preview = {
                "club_id": str(club.id),
                "name": club.name,
                "description": (club.description or "")[:300],
                "category": club.category,
                "icon_url": club.icon_url,
                "banner_url": club.banner_url,
            }
            if not message.content:
                message.content = "[Club]"
    elif share_type == "department":
        result = await db.execute(select(Department).where(Department.id == share_id))
        dept = result.scalar_one_or_none()
        if dept:
            preview = {
                "department_id": str(dept.id),
                "name": dept.name,
                "code": dept.code,
                "description": (dept.description or "")[:300],
            }
            if not message.content:
                message.content = "[Department]"

    return json.dumps(preview) if preview else None


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
    message.delivered_at = message.delivered_at or datetime.utcnow()
    await db.flush()
    return True


async def edit_message(db: AsyncSession, message_id: UUID, user: User, content: str) -> dict:
    message = await db.get(DirectMessage, message_id)
    if not message:
        raise HTTPException(status_code=404, detail="Message not found")
    if message.sender_id != user.id:
        raise HTTPException(status_code=403, detail="Only the sender can edit this message")
    if message.is_deleted:
        raise HTTPException(status_code=400, detail="Cannot edit a deleted message")

    if not content or not content.strip():
        raise HTTPException(status_code=400, detail="Content cannot be empty")
    message.content = content.strip()
    message.is_edited = True
    message.edited_at = datetime.utcnow()
    await db.flush()

    return await serialize_message(db, message, user)


async def attach_link_preview(db: AsyncSession, receiver_id: UUID, preview: dict, user: User = None) -> dict | None:
    """Attach fetched link metadata to the last message sent to receiver in the conversation."""
    from app.websockets.connection_manager import manager

    try:
        result = await db.execute(
            select(DirectMessage)
            .where(
                DirectMessage.receiver_id == receiver_id,
                DirectMessage.message_type == "link",
                DirectMessage.link_title.is_(None),
            )
            .order_by(DirectMessage.created_at.desc())
            .limit(1)
        )
        message = result.scalar_one_or_none()
        if not message:
            return None
        message.link_title = (preview.get("title") or "")[:300]
        message.link_description = preview.get("description")
        message.link_image = preview.get("image")
        await db.commit()
        if user is None:
            sender_result = await db.execute(select(User).where(User.id == message.sender_id))
            user = sender_result.scalar_one_or_none()
        serialized = await serialize_message(db, message, user)
        await _push_ws(str(receiver_id), {"type": "message_updated", "message": serialized})
        return serialized
    except Exception as e:
        logger.warning(f"Link preview attach failed: {e}")
        return None


async def delete_message(db: AsyncSession, message_id: UUID, user: User, mode: str = "me") -> dict:
    message = await db.get(DirectMessage, message_id)
    if not message:
        raise HTTPException(status_code=404, detail="Message not found")

    if mode == "everyone":
        if message.sender_id != user.id:
            raise HTTPException(status_code=403, detail="Only the sender can delete for everyone")
        message.is_deleted = True
        message.content = ""
        message.image_url = None
    else:
        deleted_for = message.deleted_for_ids
        if str(user.id) not in deleted_for:
            deleted_for.append(str(user.id))
            message.deleted_for = json.dumps(deleted_for)
    await db.flush()

    serialized = await serialize_message(db, message, user)
    return serialized


async def toggle_reaction(db: AsyncSession, message_id: UUID, user: User, emoji: str) -> list[dict]:
    if not emoji or len(emoji) > 32:
        raise HTTPException(status_code=400, detail="Invalid emoji")
    message = await db.get(DirectMessage, message_id)
    if not message or message.is_deleted:
        raise HTTPException(status_code=404, detail="Message not found")

    # only participants can react
    conv_participants = await db.execute(
        select(ConversationParticipant.user_id).where(
            ConversationParticipant.conversation_id == message.conversation_id
        )
    )
    participant_ids = {r[0] for r in conv_participants.all()}
    if user.id not in participant_ids:
        raise HTTPException(status_code=403, detail="Not a participant of this conversation")

    result = await db.execute(
        select(MessageReaction).where(
            MessageReaction.message_id == message_id,
            MessageReaction.user_id == user.id,
            MessageReaction.emoji == emoji,
        )
    )
    reaction = result.scalar_one_or_none()
    if reaction:
        await db.delete(reaction)
    else:
        db.add(MessageReaction(message_id=message_id, user_id=user.id, emoji=emoji))
    await db.flush()

    react_result = await db.execute(
        select(MessageReaction).where(MessageReaction.message_id == message_id)
    )
    return [
        {"id": str(r.id), "user_id": str(r.user_id), "emoji": r.emoji}
        for r in react_result.scalars().all()
    ]


async def toggle_star(db: AsyncSession, message_id: UUID, user: User) -> bool:
    message = await db.get(DirectMessage, message_id)
    if not message:
        raise HTTPException(status_code=404, detail="Message not found")
    message.is_starred = not message.is_starred
    await db.flush()
    return message.is_starred


async def toggle_message_pin(db: AsyncSession, message_id: UUID, user: User) -> bool:
    message = await db.get(DirectMessage, message_id)
    if not message:
        raise HTTPException(status_code=404, detail="Message not found")
    message.is_pinned = not message.is_pinned
    await db.flush()
    return message.is_pinned


async def forward_message(db: AsyncSession, user: User, message_id: UUID, receiver_id: UUID) -> dict:
    original = await db.get(DirectMessage, message_id)
    if not original:
        raise HTTPException(status_code=404, detail="Message not found")

    conversation = await get_or_create_conversation(db, user.id, receiver_id)
    new_msg = DirectMessage(
        conversation_id=conversation.id,
        sender_id=user.id,
        receiver_id=receiver_id,
        content=original.content,
        image_url=original.image_url,
        message_type=original.message_type,
        forwarded_from_id=original.id,
        is_forwarded=True,
        share_type=original.share_type,
        share_id=original.share_id,
        share_preview=original.share_preview,
    )
    if not new_msg.content and not new_msg.image_url and not new_msg.share_type:
        new_msg.content = "[Forwarded message]"
    db.add(new_msg)
    await db.flush()

    att_result = await db.execute(
        select(MessageAttachment).where(MessageAttachment.message_id == original.id)
    )
    for att in att_result.scalars().all():
        db.add(MessageAttachment(
            message_id=new_msg.id,
            file_type=att.file_type,
            file_url=att.file_url,
            file_name=att.file_name,
            file_size=att.file_size,
            mime_type=att.mime_type,
            duration=att.duration,
            width=att.width,
            height=att.height,
        ))

    conversation.updated_at = datetime.utcnow()
    await db.commit()

    serialized = await serialize_message(db, new_msg, user)
    await _push_ws(receiver_id, {"type": "new_message", "message": serialized})
    return serialized


async def search_messages(db: AsyncSession, user: User, conversation_id: UUID, query: str) -> list[dict]:
    if not query or not query.strip():
        return []
    q = (
        select(DirectMessage)
        .where(
            DirectMessage.conversation_id == conversation_id,
            DirectMessage.is_deleted == False,
            DirectMessage.content.ilike(f"%{query.strip()}%"),
        )
        .order_by(DirectMessage.created_at.desc())
        .limit(50)
    )
    result = await db.execute(q)
    messages = list(result.scalars().all())
    return [await serialize_message(db, m, user) for m in messages]


# ══════════════════════════════════════════════════════════════════════
#  CONVERSATION MANAGEMENT
# ══════════════════════════════════════════════════════════════════════

async def _get_participation(db: AsyncSession, user: User, conversation_id: UUID) -> ConversationParticipant:
    result = await db.execute(
        select(ConversationParticipant).where(
            ConversationParticipant.conversation_id == conversation_id,
            ConversationParticipant.user_id == user.id,
        )
    )
    p = result.scalar_one_or_none()
    if not p:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return p


async def toggle_conversation_pin(db: AsyncSession, user: User, conversation_id: UUID) -> bool:
    p = await _get_participation(db, user, conversation_id)
    p.is_pinned = not p.is_pinned
    await db.flush()
    return p.is_pinned


async def toggle_conversation_archive(db: AsyncSession, user: User, conversation_id: UUID) -> bool:
    p = await _get_participation(db, user, conversation_id)
    p.is_archived = not p.is_archived
    await db.flush()
    return p.is_archived


async def toggle_conversation_mute(db: AsyncSession, user: User, conversation_id: UUID) -> bool:
    p = await _get_participation(db, user, conversation_id)
    p.is_muted = not p.is_muted
    await db.flush()
    return p.is_muted


async def delete_conversation(db: AsyncSession, user: User, conversation_id: UUID) -> bool:
    """Soft-delete the conversation for the current user (marks all messages deleted_for)."""
    await _get_participation(db, user, conversation_id)
    result = await db.execute(
        select(DirectMessage).where(
            DirectMessage.conversation_id == conversation_id,
            or_(
                DirectMessage.sender_id == user.id,
                DirectMessage.receiver_id == user.id,
            ),
        )
    )
    now = datetime.utcnow()
    for m in result.scalars().all():
        deleted_for = m.deleted_for_ids
        if str(user.id) not in deleted_for:
            deleted_for.append(str(user.id))
            m.deleted_for = json.dumps(deleted_for)
        m.delivered_at = m.delivered_at or now
    await db.flush()
    return True


async def report_user(db: AsyncSession, user: User, other_user_id: UUID, reason: str) -> bool:
    other = await db.get(User, other_user_id)
    if not other:
        raise HTTPException(status_code=404, detail="User not found")
    try:
        from app.models.approval import ApprovalRequest
        db.add(ApprovalRequest(
            user_id=user.id,
            request_type="report",
            details={"reported_user_id": str(other_user_id), "reason": reason or "No reason provided"},
            status="pending",
        ))
        await db.flush()
    except Exception as e:
        logger.warning(f"Report save failed: {e}")
    return True


# ══════════════════════════════════════════════════════════════════════
#  USER SEARCH
# ══════════════════════════════════════════════════════════════════════

async def search_users(db: AsyncSession, user: User, query: str, limit: int = 20) -> list[dict]:
    q = query.strip()
    if not q:
        result = await db.execute(
            select(User).where(
                User.is_active == True,
                User.id != user.id,
            ).order_by(User.full_name).limit(limit)
        )
        candidates = result.scalars().all()
    else:
        like = f"%{q}%"
        conditions = or_(
            User.full_name.ilike(like),
            User.register_number.ilike(like),
            User.email.ilike(like),
        )
        result = await db.execute(
            select(User).where(
                User.is_active == True,
                User.id != user.id,
                conditions,
            ).order_by(User.full_name).limit(limit)
        )
        candidates = result.scalars().all()

    dept_ids = {u.department_id for u in candidates if u.department_id}
    dept_map = {}
    if dept_ids:
        dept_result = await db.execute(select(Department).where(Department.id.in_(dept_ids)))
        dept_map = {d.id: d for d in dept_result.scalars().all()}

    blocked = set(await get_blocked_users(db, user))
    my_conv_ids = select(ConversationParticipant.conversation_id).where(
        ConversationParticipant.user_id == user.id
    )

    from app.websockets.connection_manager import manager

    results = []
    for u in candidates:
        # exclude already-blocked-by-other? keep both visible but flagged
        conv_check = await db.execute(
            select(ConversationParticipant.conversation_id).where(
                ConversationParticipant.user_id == u.id,
                ConversationParticipant.conversation_id.in_(my_conv_ids),
            ).limit(1)
        )
        results.append({
            "id": str(u.id),
            "full_name": u.full_name,
            "email": u.email,
            "role": u.role,
            "avatar_url": u.avatar_url,
            "register_number": u.register_number,
            "department_name": dept_map[u.department_id].name if u.department_id in dept_map else None,
            "department_code": dept_map[u.department_id].code if u.department_id in dept_map else None,
            "year": u.year,
            "is_online": manager.is_online(str(u.id)),
            "is_blocked": str(u.id) in blocked,
            "has_conversation": conv_check.scalar_one_or_none() is not None,
        })
    return results

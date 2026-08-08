import re
import logging
from uuid import UUID
from typing import Optional

import httpx
from fastapi import APIRouter, Depends, Query, Body, HTTPException, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_db, get_current_user
from app.models.user import User
from app.schemas.message import MessageCreate, MessageOut
from app.schemas.common import ResponseModel, PaginatedResponse
from app.services import message_service
from app.services import upload_service

logger = logging.getLogger("magnet.messages")

router = APIRouter(prefix="/messages", tags=["Messages"])

URL_RE = re.compile(r"(https?://[^\s]+)")


async def _fetch_link_preview(url: str) -> dict:
    """Best-effort OpenGraph preview for a URL."""
    try:
        async with httpx.AsyncClient(timeout=4.0, follow_redirects=True) as client:
            resp = await client.get(url, headers={
                "User-Agent": "Mozilla/5.0 (compatible; MagnetBot/1.0)",
            })
            resp.raise_for_status()
            html = resp.text[:300000]

            def _meta(prop: str) -> str | None:
                m = re.search(
                    rf'<meta[^>]+(?:property|name)=["\']{prop}["\'][^>]+content=["\']([^"\']+)["\']',
                    html, re.IGNORECASE,
                )
                if not m:
                    m = re.search(
                        rf'<meta[^>]+content=["\']([^"\']+)["\'][^>]+(?:property|name)=["\']{prop}["\']',
                        html, re.IGNORECASE,
                    )
                return m.group(1)[:500] if m else None

            title = _meta("og:title") or _meta("twitter:title")
            description = _meta("og:description") or _meta("twitter:description")
            image = _meta("og:image") or _meta("twitter:image")
            if not title:
                t = re.search(r"<title[^>]*>(.*?)</title>", html, re.IGNORECASE | re.DOTALL)
                title = t.group(1).strip()[:300] if t else None
            return {"title": title, "description": description, "image": image}
    except Exception as e:
        logger.debug(f"Link preview failed for {url}: {e}")
        return {"title": None, "description": None, "image": None}


# ──────────────────────────────────────────────────────────────────────
#  CONVERSATIONS
# ──────────────────────────────────────────────────────────────────────

@router.get("/conversations", response_model=ResponseModel)
async def get_conversations(
    search: Optional[str] = Query(None),
    filter: Optional[str] = Query(None, pattern="^(pinned|archived|unread)?$"),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    conversations = await message_service.get_conversations(db, user, search=search, filter=filter)
    return ResponseModel(data=conversations)


@router.get("/conversations/{user_id}", response_model=PaginatedResponse)
async def get_conversation_messages(
    user_id: UUID,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    messages, total, conversation = await message_service.get_conversation_messages(
        db, user, user_id, page, page_size
    )
    return PaginatedResponse(
        data=messages,
        total=total,
        page=page,
        page_size=page_size,
        has_next=(page * page_size) < total,
    )


@router.post("/conversations", response_model=ResponseModel)
async def create_conversation(
    payload: dict = Body(...),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    other_user_id = payload.get("user_id")
    if not other_user_id:
        raise HTTPException(status_code=422, detail="user_id is required")
    conversation = await message_service.get_or_create_conversation(db, user.id, UUID(other_user_id))
    await db.commit()
    return ResponseModel(data={"conversation_id": str(conversation.id)}, message="Conversation ready")


@router.put("/conversations/{conversation_id}/read", response_model=ResponseModel)
async def mark_conversation_read(
    conversation_id: UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    await message_service.mark_conversation_read(db, user, conversation_id)
    await db.commit()
    return ResponseModel(message="Marked as read")


@router.post("/conversations/{conversation_id}/pin", response_model=ResponseModel)
async def pin_conversation(
    conversation_id: UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    value = await message_service.toggle_conversation_pin(db, user, conversation_id)
    await db.commit()
    return ResponseModel(data={"is_pinned": value}, message="Updated")


@router.post("/conversations/{conversation_id}/archive", response_model=ResponseModel)
async def archive_conversation(
    conversation_id: UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    value = await message_service.toggle_conversation_archive(db, user, conversation_id)
    await db.commit()
    return ResponseModel(data={"is_archived": value}, message="Updated")


@router.post("/conversations/{conversation_id}/mute", response_model=ResponseModel)
async def mute_conversation(
    conversation_id: UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    value = await message_service.toggle_conversation_mute(db, user, conversation_id)
    await db.commit()
    return ResponseModel(data={"is_muted": value}, message="Updated")


@router.delete("/conversations/{conversation_id}", response_model=ResponseModel)
async def delete_conversation(
    conversation_id: UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    await message_service.delete_conversation(db, user, conversation_id)
    await db.commit()
    return ResponseModel(message="Conversation deleted")


@router.get("/conversations/{conversation_id}/search", response_model=ResponseModel)
async def search_in_conversation(
    conversation_id: UUID,
    q: str = Query(..., min_length=1),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    results = await message_service.search_messages(db, user, conversation_id, q)
    return ResponseModel(data=results)


# ──────────────────────────────────────────────────────────────────────
#  SENDING
# ──────────────────────────────────────────────────────────────────────

@router.post("", response_model=ResponseModel, status_code=201)
@router.post("/", response_model=ResponseModel, status_code=201)
async def send_message(
    data: MessageCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    payload = data.model_dump()
    message = await message_service.send_message(db, user, data.receiver_id, payload)

    # link preview enrichment
    if message.get("message_type") == "link" and message.get("content"):
        preview = await _fetch_link_preview(message["content"])
        if preview.get("title") or preview.get("image"):
            updated = await message_service.attach_link_preview(db, data.receiver_id, preview, user)
            message = updated or message
    return ResponseModel(data=message, message="Message sent")


@router.post("/share-post", response_model=ResponseModel, status_code=201)
async def share_post(
    payload: dict = Body(...),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    receiver_id = payload.get("receiver_id")
    post_id = payload.get("post_id")
    if not receiver_id or not post_id:
        raise HTTPException(status_code=422, detail="receiver_id and post_id are required")
    caption = payload.get("content") or ""
    msg_payload = {
        "content": caption,
        "message_type": "post",
        "share_type": "post",
        "share_id": UUID(post_id),
    }
    message = await message_service.send_message(db, user, UUID(receiver_id), msg_payload)
    return ResponseModel(data=message, message="Post shared")


@router.post("/upload", response_model=ResponseModel)
async def upload_message_attachment(
    file: UploadFile,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    result = await upload_service.upload_message_attachment(file)
    return ResponseModel(data=result, message="File uploaded")


# ──────────────────────────────────────────────────────────────────────
#  MESSAGE OPERATIONS
# ──────────────────────────────────────────────────────────────────────

@router.put("/{message_id}", response_model=ResponseModel)
async def edit_message(
    message_id: UUID,
    payload: dict = Body(...),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    content = payload.get("content")
    message = await message_service.edit_message(db, message_id, user, content)
    await db.commit()
    return ResponseModel(data=message, message="Message updated")


@router.delete("/{message_id}", response_model=ResponseModel)
async def delete_message(
    message_id: UUID,
    mode: str = Query("me", pattern="^(me|everyone)$"),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    message = await message_service.delete_message(db, message_id, user, mode)
    await db.commit()
    return ResponseModel(data=message, message="Message deleted")


@router.put("/{message_id}/read", response_model=ResponseModel)
async def mark_read(message_id: UUID, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    await message_service.mark_message_read(db, message_id, user)
    await db.commit()
    return ResponseModel(message="Marked as read")


@router.post("/{message_id}/react", response_model=ResponseModel)
async def react_to_message(
    message_id: UUID,
    payload: dict = Body(...),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    emoji = payload.get("emoji")
    if not emoji:
        raise HTTPException(status_code=422, detail="emoji is required")
    reactions = await message_service.toggle_reaction(db, message_id, user, emoji)
    await db.commit()
    return ResponseModel(data={"reactions": reactions}, message="Reaction updated")


@router.post("/{message_id}/star", response_model=ResponseModel)
async def star_message(message_id: UUID, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    value = await message_service.toggle_star(db, message_id, user)
    await db.commit()
    return ResponseModel(data={"is_starred": value}, message="Updated")


@router.post("/{message_id}/pin", response_model=ResponseModel)
async def pin_message(message_id: UUID, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    value = await message_service.toggle_message_pin(db, message_id, user)
    await db.commit()
    return ResponseModel(data={"is_pinned": value}, message="Updated")


@router.post("/{message_id}/forward", response_model=ResponseModel)
async def forward_message(
    message_id: UUID,
    payload: dict = Body(...),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    receiver_id = payload.get("receiver_id")
    if not receiver_id:
        raise HTTPException(status_code=422, detail="receiver_id is required")
    message = await message_service.forward_message(db, user, message_id, UUID(receiver_id))
    return ResponseModel(data=message, message="Message forwarded")


# ──────────────────────────────────────────────────────────────────────
#  USER ACTIONS (search / block / report)
# ──────────────────────────────────────────────────────────────────────

@router.get("/users/search", response_model=ResponseModel)
async def search_users(
    q: str = Query("", max_length=100),
    limit: int = Query(20, ge=1, le=50),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    results = await message_service.search_users(db, user, q, limit)
    return ResponseModel(data=results)


@router.get("/blocked", response_model=ResponseModel)
async def list_blocked(db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    blocked_ids = await message_service.get_blocked_users(db, user)
    return ResponseModel(data={"blocked_ids": blocked_ids})


@router.post("/users/{user_id}/block", response_model=ResponseModel)
async def block_user(
    user_id: UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    await message_service.block_user(db, user, user_id)
    await db.commit()
    return ResponseModel(message="User blocked")


@router.delete("/users/{user_id}/block", response_model=ResponseModel)
async def unblock_user(
    user_id: UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    await message_service.unblock_user(db, user, user_id)
    await db.commit()
    return ResponseModel(message="User unblocked")


@router.post("/users/{user_id}/report", response_model=ResponseModel)
async def report_user(
    user_id: UUID,
    payload: dict = Body(default={}),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    reason = (payload or {}).get("reason", "")
    await message_service.report_user(db, user, user_id, reason)
    await db.commit()
    return ResponseModel(message="Report submitted")

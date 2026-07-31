import json
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
from app.utils.security import decode_token
from app.websockets.connection_manager import manager

router = APIRouter(tags=["WebSocket"])


@router.websocket("/ws/notifications")
async def websocket_notifications(websocket: WebSocket, token: str = Query(...)):
    """Real-time notification delivery. Server pushes notification objects on new events.
    Client can send ping to keep connection alive."""
    payload = decode_token(token)
    if not payload or payload.get("type") != "access":
        await websocket.close(code=4001, reason="Invalid token")
        return

    user_id = payload.get("sub")
    await manager.connect_user(websocket, user_id)

    try:
        while True:
            data = await websocket.receive_text()
            try:
                message = json.loads(data)
                if message.get("type") == "ping":
                    await websocket.send_json({"type": "pong"})
            except json.JSONDecodeError:
                await websocket.send_json({"type": "error", "message": "Invalid JSON"})

    except WebSocketDisconnect:
        manager.disconnect_user(websocket, user_id)


@router.websocket("/ws/messages")
async def websocket_messages(websocket: WebSocket, token: str = Query(...)):
    """Real-time direct messaging socket.

    Client -> Server events:
      ping                          -> pong
      typing {conversation_with}    -> notify partner typing started
      stop_typing {conversation_with}
      seen {conversation_with}      -> notify partner messages were seen
      delivered {conversation_with} -> notify partner messages were delivered
      presence                      -> notify partners this user is online

    Server -> Client pushes:
      new_message, message_updated, message_deleted, reaction_updated,
      typing, stop_typing, message_seen, message_delivered, presence
    """
    payload = decode_token(token)
    if not payload or payload.get("type") != "access":
        await websocket.close(code=4001, reason="Invalid token")
        return

    user_id = payload.get("sub")
    await manager.connect_user(websocket, user_id)

    partner_ids = set()

    async def load_partners():
        nonlocal partner_ids
        try:
            from app.database import AsyncSessionLocal
            from app.models.message import ConversationParticipant
            from sqlalchemy import select
            async with AsyncSessionLocal() as db:
                result = await db.execute(
                    select(ConversationParticipant.conversation_id).where(
                        ConversationParticipant.user_id == user_id
                    )
                )
                conv_ids = [r[0] for r in result.all()]
                if not conv_ids:
                    partner_ids = set()
                    return
                result2 = await db.execute(
                    select(ConversationParticipant.user_id).where(
                        ConversationParticipant.conversation_id.in_(conv_ids),
                        ConversationParticipant.user_id != user_id,
                    )
                )
                partner_ids = {str(r[0]) for r in result2.all()}
        except Exception:
            partner_ids = set()

    async def broadcast_presence(status: str):
        if not partner_ids:
            return
        for partner_id in partner_ids:
            await manager.send_to_user(partner_id, {
                "type": "presence",
                "user_id": user_id,
                "status": status,
            })

    await load_partners()
    await broadcast_presence("online")

    try:
        while True:
            data = await websocket.receive_text()
            try:
                message = json.loads(data)
                msg_type = message.get("type")

                if msg_type == "ping":
                    await websocket.send_json({"type": "pong"})

                elif msg_type in ("typing", "stop_typing"):
                    partner = message.get("conversation_with")
                    if partner:
                        await manager.send_to_user(partner, {
                            "type": msg_type,
                            "sender_id": user_id,
                            "conversation_id": message.get("conversation_id"),
                        })

                elif msg_type in ("seen", "delivered"):
                    partner = message.get("conversation_with")
                    if partner:
                        await manager.send_to_user(partner, {
                            "type": "message_seen" if msg_type == "seen" else "message_delivered",
                            "sender_id": user_id,
                            "conversation_id": message.get("conversation_id"),
                            "message_id": message.get("message_id"),
                        })

                elif msg_type == "presence":
                    await broadcast_presence("online")

            except json.JSONDecodeError:
                await websocket.send_json({"type": "error", "message": "Invalid JSON"})

    except WebSocketDisconnect:
        manager.disconnect_user(websocket, user_id)
        await broadcast_presence("offline")


@router.websocket("/ws/channels/{channel_id}")
async def websocket_channel(websocket: WebSocket, channel_id: str, token: str = Query(...)):
    payload = decode_token(token)
    if not payload or payload.get("type") != "access":
        await websocket.close(code=4001, reason="Invalid token")
        return

    user_id = payload.get("sub")

    from app.database import AsyncSessionLocal
    from app.models.channel import ChannelMember
    from sqlalchemy import select

    async with AsyncSessionLocal() as db:
        member_check = await db.execute(
            select(ChannelMember.id).where(
                ChannelMember.channel_id == channel_id,
                ChannelMember.user_id == user_id
            )
        )
        if not member_check.scalar_one_or_none():
            await websocket.close(code=4003, reason="Not a channel member")
            return

    if channel_id not in manager.channel_connections:
        manager.channel_connections[channel_id] = set()
    manager.channel_connections[channel_id].add(websocket)

    try:
        while True:
            data = await websocket.receive_text()
            try:
                message = json.loads(data)

                msg_type = message.get("type")

                if msg_type == "ping":
                    await websocket.send_json({"type": "pong"})

                elif msg_type == "message":
                    content = message.get("content")
                    image_url = message.get("image_url")

                    if content or image_url:
                        await manager.send_to_channel(
                            channel_id,
                            {
                                "type": "new_channel_message",
                                "channel_id": channel_id,
                                "sender_id": user_id,
                                "content": content,
                                "image_url": image_url,
                            },
                            exclude_user=user_id,
                        )

            except json.JSONDecodeError:
                await websocket.send_json({"type": "error", "message": "Invalid JSON"})

    except WebSocketDisconnect:
        manager.disconnect_channel(websocket, channel_id)

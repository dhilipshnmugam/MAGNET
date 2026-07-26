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

                msg_type = message.get("type")

                if msg_type == "ping":
                    await websocket.send_json({"type": "pong"})

                elif msg_type == "message":
                    receiver_id = message.get("receiver_id")
                    content = message.get("content")
                    image_url = message.get("image_url")

                    if receiver_id and (content or image_url):
                        await manager.send_to_user(
                            receiver_id,
                            {
                                "type": "new_message",
                                "sender_id": user_id,
                                "content": content,
                                "image_url": image_url,
                            }
                        )

            except json.JSONDecodeError:
                await websocket.send_json({"type": "error", "message": "Invalid JSON"})

    except WebSocketDisconnect:
        manager.disconnect_user(websocket, user_id)


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

from typing import Dict, Set, Optional
from uuid import UUID
from fastapi import WebSocket
import json


class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, Set[WebSocket]] = {}
        self.user_connections: Dict[str, Set[WebSocket]] = {}
        self.channel_connections: Dict[str, Set[WebSocket]] = {}
        self._ws_user_map: Dict[WebSocket, str] = {}

    async def connect_user(self, websocket: WebSocket, user_id: str):
        await websocket.accept()
        if user_id not in self.user_connections:
            self.user_connections[user_id] = set()
        self.user_connections[user_id].add(websocket)

    def disconnect_user(self, websocket: WebSocket, user_id: str):
        if user_id in self.user_connections:
            self.user_connections[user_id].discard(websocket)
            if not self.user_connections[user_id]:
                del self.user_connections[user_id]

    async def connect_channel(self, websocket: WebSocket, channel_id: str):
        await websocket.accept()
        if channel_id not in self.channel_connections:
            self.channel_connections[channel_id] = set()
        self.channel_connections[channel_id].add(websocket)

    def disconnect_channel(self, websocket: WebSocket, channel_id: str):
        if channel_id in self.channel_connections:
            self.channel_connections[channel_id].discard(websocket)
            if not self.channel_connections[channel_id]:
                del self.channel_connections[channel_id]

    async def send_to_user(self, user_id: str, message: dict):
        if user_id in self.user_connections:
            dead = set()
            for ws in self.user_connections[user_id]:
                try:
                    await ws.send_json(message)
                except Exception:
                    dead.add(ws)
            for ws in dead:
                self.user_connections[user_id].discard(ws)

    async def send_to_channel(self, channel_id: str, message: dict, exclude_user: str = None):
        if channel_id in self.channel_connections:
            dead = set()
            for ws in self.channel_connections[channel_id]:
                try:
                    await ws.send_json(message)
                except Exception:
                    dead.add(ws)
            for ws in dead:
                self.channel_connections[channel_id].discard(ws)

    async def broadcast(self, message: dict):
        for user_id in list(self.user_connections.keys()):
            await self.send_to_user(user_id, message)

    def get_online_users(self) -> list[str]:
        return list(self.user_connections.keys())

    def is_online(self, user_id: str) -> bool:
        return user_id in self.user_connections and len(self.user_connections[user_id]) > 0


manager = ConnectionManager()

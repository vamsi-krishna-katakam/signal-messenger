import json
import asyncio
from typing import Dict, List, Set
from fastapi import WebSocket


class ConnectionManager:
    """Manages active WebSocket connections per user_id and handles event broadcasts."""

    def __init__(self):
        # Maps user_id -> List of active WebSocket connections (allows multi-tab/device)
        self.active_connections: Dict[str, List[WebSocket]] = {}

    async def connect(self, user_id: str, websocket: WebSocket):
        """Accepts WebSocket connection and tracks it under user_id."""
        await websocket.accept()
        if user_id not in self.active_connections:
            self.active_connections[user_id] = []
        self.active_connections[user_id].append(websocket)
        print(f"WebSocket connected for user: {user_id}. Active sockets: {len(self.active_connections[user_id])}")

    def disconnect(self, user_id: str, websocket: WebSocket):
        """Removes a disconnected WebSocket from user tracking."""
        if user_id in self.active_connections:
            if websocket in self.active_connections[user_id]:
                self.active_connections[user_id].remove(websocket)
            if not self.active_connections[user_id]:
                del self.active_connections[user_id]
        print(f"WebSocket disconnected for user: {user_id}")

    async def send_to_user(self, user_id: str, data: dict):
        """Sends a JSON event payload to all active WebSocket connections of a specific user."""
        if user_id in self.active_connections:
            disconnected_sockets = []
            for connection in self.active_connections[user_id]:
                try:
                    await connection.send_text(json.dumps(data))
                except Exception as e:
                    print(f"Failed to send to user {user_id}: {e}")
                    disconnected_sockets.append(connection)
            
            # Cleanup stale connections if any
            for dead in disconnected_sockets:
                self.disconnect(user_id, dead)

    async def broadcast_to_users(self, user_ids: List[str], data: dict):
        """Broadcasts a JSON event payload to a list of target user IDs (e.g. group members)."""
        tasks = [self.send_to_user(uid, data) for uid in user_ids]
        await asyncio.gather(*tasks, return_exceptions=True)

    def is_user_online(self, user_id: str) -> bool:
        """Returns True if user has at least 1 active WebSocket connection."""
        return user_id in self.active_connections and len(self.active_connections[user_id]) > 0


# Global singleton instance of ConnectionManager
manager = ConnectionManager()

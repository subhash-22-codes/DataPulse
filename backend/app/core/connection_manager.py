# connection_manager.py

import logging
from fastapi import WebSocket
from typing import List, Dict
import asyncio

logger = logging.getLogger(__name__)

class ConnectionManager:
    """
    Manages WebSocket connections for:
    - workspace broadcasting (workspace_id)
    - user notifications (user_id)
    """
    def __init__(self):
        self.workspace_connections: Dict[str, List[WebSocket]] = {}
        self.user_connections: Dict[str, List[WebSocket]] = {}

    async def connect(self, ws_type: str, item_id: str, websocket: WebSocket):
        """
        Register a WebSocket client. Accept must be done by the caller after auth.
        """
        if ws_type == 'workspace':
            if item_id not in self.workspace_connections:
                self.workspace_connections[item_id] = []
            self.workspace_connections[item_id].append(websocket)
            logger.info(f"WS client connected to workspace: {item_id}")

        elif ws_type == 'user':
            if item_id not in self.user_connections:
                self.user_connections[item_id] = []
            self.user_connections[item_id].append(websocket)
            logger.info(f"WS client connected to user channel: {item_id}")

    def disconnect(self, ws_type: str, item_id: str, websocket: WebSocket):
        """
        Remove a WebSocket client from connections.
        """
        connections = self.workspace_connections if ws_type == 'workspace' else self.user_connections
        conn_name = 'workspace' if ws_type == 'workspace' else 'user channel'

        try:
            if item_id in connections:
                connections[item_id].remove(websocket)
                if not connections[item_id]:
                    del connections[item_id]
                logger.info(f"WS client disconnected from {conn_name}: {item_id}")
        except ValueError:
            logger.warning(f"WS client already disconnected from {conn_name}: {item_id}")

    async def broadcast_to_workspace(self, workspace_id: str, message: str):
        """
        Send a text message to all clients in a workspace.
        """
        if workspace_id in self.workspace_connections:
            connections = list(self.workspace_connections[workspace_id])
            logger.info(f"Broadcasting '{message}' to {len(connections)} clients in workspace {workspace_id}")
            send_tasks = [conn.send_text(message) for conn in connections]
            await asyncio.gather(*send_tasks, return_exceptions=True)

    async def push_to_user(self, user_id: str, message: dict):
        """
        Send a JSON message to all active sessions for a specific user.
        """
        if user_id in self.user_connections:
            connections = list(self.user_connections[user_id])
            logger.debug(f"Pushing notification to {len(connections)} sockets for user {user_id}")
            send_tasks = [conn.send_json(message) for conn in connections]
            await asyncio.gather(*send_tasks, return_exceptions=True)


# Global instance for the app
manager = ConnectionManager()

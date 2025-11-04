import logging
from fastapi import WebSocket
from typing import List, Dict

logger = logging.getLogger(__name__)

class ConnectionManager:
    """
    Manages active WebSocket connections in memory.
    This replaces the need for Redis in production for simple signaling.
    
    We store connections by 'workspace_id' to broadcast to all
    clients viewing that workspace, not just one client_id.
    """
    def __init__(self):
        # Store connections as {workspace_id: [list, of, websockets]}
        self.active_connections: Dict[str, List[WebSocket]] = {}

    async def connect(self, workspace_id: str, websocket: WebSocket):
        """A new client connects to a workspace."""
        await websocket.accept()
        if workspace_id not in self.active_connections:
            self.active_connections[workspace_id] = []
        self.active_connections[workspace_id].append(websocket)
        logger.info(f"WebSocket client connected to workspace: {workspace_id}")

    def disconnect(self, workspace_id: str, websocket: WebSocket):
        """A client disconnects from a workspace."""
        try:
            if workspace_id in self.active_connections:
                self.active_connections[workspace_id].remove(websocket)
                # If no clients are left, remove the workspace key
                if not self.active_connections[workspace_id]:
                    del self.active_connections[workspace_id]
            logger.info(f"WebSocket client disconnected from workspace: {workspace_id}")
        except ValueError:
            # Catch race condition where client is already removed
            logger.warning(f"WebSocket client already disconnected from workspace: {workspace_id}")


    async def broadcast_to_workspace(self, workspace_id: str, message: str):
        """Sends a message to all connected clients in a specific workspace."""
        if workspace_id in self.active_connections:
            connections = self.active_connections[workspace_id]
            logger.info(f"Broadcasting '{message}' to {len(connections)} clients in workspace {workspace_id}")
            # Iterate over a copy in case a disconnect happens during the broadcast
            for connection in list(connections):
                try:
                    await connection.send_text(message)
                except Exception:
                    # Client disconnected unexpectedly, remove them
                    self.disconnect(workspace_id, connection)

# Create a single, global instance that our app will use
manager = ConnectionManager()


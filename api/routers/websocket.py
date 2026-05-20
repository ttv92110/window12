from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
from typing import List, Dict
from jose import JWTError, jwt 
from api.core.config import settings
 

# Map user_id -> list of WebSocket connections
user_connections: Dict[str, List[WebSocket]] = {}
active_connections: List[WebSocket] = []

router = APIRouter() 

@router.websocket("/ws/notifications")
async def websocket_notifications(websocket: WebSocket):
    await websocket.accept()
    active_connections.append(websocket)
    try:
        while True:
            await websocket.receive_text()  # keep alive
    except WebSocketDisconnect:
        active_connections.remove(websocket)
  
async def authenticate_websocket(websocket: WebSocket, token: str) -> str:
    """Validate JWT token and return user_id."""
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id = payload.get("sub")
        if user_id is None:
            await websocket.close(code=4001)
            return None
        return user_id
    except JWTError:
        await websocket.close(code=4001)
        return None
 
async def broadcast_to_user(user_id: str, message: dict):
    """Send a message to all WebSocket connections of a specific user."""
    connections = user_connections.get(user_id, [])
    for conn in connections:
        try:
            await conn.send_json(message)
        except Exception:
            pass

async def broadcast_notification(user_id: str, notification: dict):
    """Helper to broadcast notification to a user."""
    await broadcast_to_user(user_id, {"type": "notification", "data": notification})

async def broadcast_file_change(user_id: str, action: str, file_data: dict):
    """Broadcast a file change (create/update/delete) to the user."""
    await broadcast_to_user(user_id, {"type": "file_change", "action": action, "data": file_data})

async def broadcast_note_change(user_id: str, action: str, note_data: dict):
    await broadcast_to_user(user_id, {"type": "note_change", "action": action, "data": note_data})

async def broadcast_settings_change(user_id: str):
    await broadcast_to_user(user_id, {"type": "settings_changed", "data": {}})
     
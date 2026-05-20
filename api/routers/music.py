from fastapi import APIRouter, Depends, HTTPException
from api.core.security import get_current_user
from api.services.playlist_service import playlist_service
from pydantic import BaseModel
from typing import List, Optional

router = APIRouter(prefix="/music", tags=["music"])

class PlaylistCreate(BaseModel):
    name: str
    file_ids: List[str] = []

class PlaylistUpdate(BaseModel):
    name: Optional[str] = None
    file_ids: Optional[List[str]] = None

@router.get("/playlists")
async def get_playlists(current_user: str = Depends(get_current_user)):
    return await playlist_service.get_all(current_user)

@router.post("/playlists")
async def create_playlist(pl: PlaylistCreate, current_user: str = Depends(get_current_user)):
    data = {
        "name": pl.name,
        "file_ids_json": str(pl.file_ids)  # store as JSON string
    }
    created = await playlist_service.create(current_user, data)
    return {"id": created["id"], "name": created["name"]}

@router.put("/playlists/{playlist_id}")
async def update_playlist(playlist_id: str, pl: PlaylistUpdate, current_user: str = Depends(get_current_user)):
    updates = {}
    if pl.name is not None:
        updates["name"] = pl.name
    if pl.file_ids is not None:
        updates["file_ids_json"] = str(pl.file_ids)
    updated = await playlist_service.update(current_user, playlist_id, updates)
    if not updated:
        raise HTTPException(404, "Playlist not found")
    return {"message": "Updated"}

@router.delete("/playlists/{playlist_id}")
async def delete_playlist(playlist_id: str, current_user: str = Depends(get_current_user)):
    if not await playlist_service.delete(current_user, playlist_id):
        raise HTTPException(404, "Playlist not found")
    return {"message": "Deleted"}
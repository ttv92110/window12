from fastapi import APIRouter, Depends, HTTPException
from api.core.security import get_current_user
from api.services.note_service import note_service
from api.models.schemas import NoteCreate, NoteUpdate

router = APIRouter(prefix="/notes", tags=["notes"])

@router.get("/")
async def get_notes(current_user: str = Depends(get_current_user)):
    return await note_service.get_all_notes(current_user)

@router.post("/")
async def create_note(note: NoteCreate, current_user: str = Depends(get_current_user)):
    created = await note_service.create_note(current_user, note.dict())
    return {"id": created["id"]}

@router.put("/{note_id}")
async def update_note(note_id: str, update: NoteUpdate, current_user: str = Depends(get_current_user)):
    updates = update.dict(exclude_unset=True)
    updated = await note_service.update_note(current_user, note_id, updates)
    if not updated:
        raise HTTPException(404, "Note not found")
    return {"message": "Updated"}

@router.delete("/{note_id}")
async def delete_note(note_id: str, current_user: str = Depends(get_current_user)):
    if not await note_service.delete_note(current_user, note_id):
        raise HTTPException(404, "Note not found")
    return {"message": "Deleted"}
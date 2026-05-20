from fastapi import APIRouter, Depends, HTTPException
from api.core.security import get_current_user
from api.services.event_service import event_service
from api.models.schemas import EventCreate, EventUpdate

router = APIRouter(prefix="/calendar", tags=["calendar"])

@router.get("/")
async def get_events(current_user: str = Depends(get_current_user)):
    return await event_service.get_all(current_user)

@router.get("/{event_id}")
async def get_event(event_id: str, current_user: str = Depends(get_current_user)):
    event = await event_service.get_by_id(current_user, event_id)
    if not event:
        raise HTTPException(404, "Event not found")
    return event

@router.post("/")
async def create_event(event: EventCreate, current_user: str = Depends(get_current_user)):
    return await event_service.create(current_user, event.dict())

@router.put("/{event_id}")
async def update_event(event_id: str, update: EventUpdate, current_user: str = Depends(get_current_user)):
    updates = update.dict(exclude_unset=True)
    updated = await event_service.update(current_user, event_id, updates)
    if not updated:
        raise HTTPException(404, "Event not found")
    return {"message": "Updated"}

@router.delete("/{event_id}")
async def delete_event(event_id: str, current_user: str = Depends(get_current_user)):
    if not await event_service.delete(current_user, event_id):
        raise HTTPException(404, "Event not found")
    return {"message": "Deleted"}
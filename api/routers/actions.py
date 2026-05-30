from fastapi import APIRouter, Depends, HTTPException
from api.core.security import get_current_user
from api.services.action_service import action_service

router = APIRouter(prefix="/action", tags=["action"])

@router.post("/undo")
async def undo(user_id: str = Depends(get_current_user)):
    result = await action_service.undo(user_id)
    return result

@router.post("/redo")
async def redo(user_id: str = Depends(get_current_user)):
    result = await action_service.redo(user_id)
    return result
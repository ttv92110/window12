from fastapi import APIRouter, Depends, HTTPException
from api.core.security import get_current_user
from api.services.trash_service import trash_service

router = APIRouter(prefix="/trash", tags=["trash"])

@router.get("/")
async def get_trash(user_id: str = Depends(get_current_user)):
    return await trash_service.get_all(user_id)

@router.post("/restore/{item_id}")
async def restore_item(item_id: str, user_id: str = Depends(get_current_user)):
    restored = await trash_service.restore(user_id, item_id)
    if not restored:
        raise HTTPException(404, "Item not found in trash")
    return {"message": "Restored"}

@router.delete("/empty")
async def empty_trash(user_id: str = Depends(get_current_user)):
    await trash_service.empty(user_id)
    return {"message": "Trash emptied"}

@router.delete("/{item_id}")
async def permanent_delete(item_id: str, user_id: str = Depends(get_current_user)):
    await trash_service.permanent_delete(user_id, item_id)
    return {"message": "Deleted forever"}
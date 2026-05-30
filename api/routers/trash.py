from fastapi import APIRouter, Depends, HTTPException
from api.core.security import get_current_user
from api.repositories.trash_repo import trash_repo
from api.repositories.file_repo import file_repo
from api.routers.websocket import broadcast_file_change

router = APIRouter(prefix="/trash", tags=["trash"])

@router.get("/")
async def list_trash(current_user: str = Depends(get_current_user)):
    return trash_repo.get_all(current_user)

@router.post("/restore/{item_id}")
async def restore_from_trash(item_id: str, current_user: str = Depends(get_current_user)):
    trashed = trash_repo.get_by_id(current_user, item_id)
    if not trashed:
        raise HTTPException(404, "Item not found in trash")
    # Restore to original parent (or root if parent no longer exists)
    file_data = {
        "name": trashed["original_name"],
        "type": trashed["original_type"],
        "parent_id": trashed["original_parent_id"],
        "content": trashed.get("content", ""),
        "extension": trashed.get("extension", ""),
        "mime_type": trashed.get("mime_type", "")
    }
    restored = file_repo.create(current_user, file_data)
    # Remove from trash
    trash_repo.delete_permanently(current_user, item_id)
    await broadcast_file_change(current_user, "created", restored)
    return {"message": "Restored", "file": restored}

@router.delete("/empty")
async def empty_trash(current_user: str = Depends(get_current_user)):
    count = trash_repo.empty_trash(current_user)
    return {"message": f"Empty trash deleted {count} items"}

@router.delete("/{item_id}")
async def delete_forever(item_id: str, current_user: str = Depends(get_current_user)):
    if not trash_repo.delete_permanently(current_user, item_id):
        raise HTTPException(404, "Item not found")
    return {"message": "Permanently deleted"}
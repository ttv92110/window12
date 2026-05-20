from fastapi import APIRouter, Depends, HTTPException
from api.core.security import get_current_user
from api.services.file_service import file_service
from api.models.schemas import FileCreate, FileUpdate

router = APIRouter(prefix="/files", tags=["files"])

@router.get("/")
async def list_files(current_user: str = Depends(get_current_user)):
    return await file_service.get_all_files(current_user)

@router.get("/{file_id}")
async def get_file(file_id: str, current_user: str = Depends(get_current_user)):
    f = await file_service.get_file(current_user, file_id)
    if not f:
        raise HTTPException(404, "File not found")
    return f

@router.post("/")
async def create_file(file: FileCreate, current_user: str = Depends(get_current_user)):
    return await file_service.create_file(current_user, file.dict())

@router.put("/{file_id}")
async def update_file(file_id: str, update: FileUpdate, current_user: str = Depends(get_current_user)):
    updates = update.dict(exclude_unset=True)
    updated = await file_service.update_file(current_user, file_id, updates)
    if not updated:
        raise HTTPException(404, "File not found")
    return {"message": "Updated"}

@router.delete("/{file_id}")
async def delete_file(file_id: str, current_user: str = Depends(get_current_user)):
    if not await file_service.delete_file(current_user, file_id):
        raise HTTPException(404, "File not found")
    return {"message": "Deleted"}

@router.post("/{file_id}/copy")
async def copy_file(file_id: str, current_user: str = Depends(get_current_user)):
    copied = await file_service.copy_file(current_user, file_id)
    if not copied:
        raise HTTPException(404, "Original file not found")
    return copied
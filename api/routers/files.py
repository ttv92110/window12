from fastapi import APIRouter, Depends, HTTPException, Query
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
    
    if updates.get('parent_id') == 'recycle_bin':
        file_record = await file_service.get_file(current_user, file_id)
        if file_record:
            updates['_original_parent'] = file_record.get('parent_id', 'root')
    
    updated = await file_service.update_file(current_user, file_id, updates)
    if not updated:
        raise HTTPException(404, "File not found") 

    updated = await file_service.update_file(current_user, file_id, updates)
    if not updated:
        raise HTTPException(404, "File not found")
    return  {"message": "Updated", "file": updated}

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


@router.get("/recycle/list")
async def list_recycle_bin(current_user: str = Depends(get_current_user)):
    """
    List all items in recycle bin for current user
    Returns files with parent_id = 'recycle_bin'
    """
    return await file_service.get_recycle_bin_items(current_user)

@router.post("/recycle/restore/{file_id}")
async def restore_from_recycle(file_id: str, current_user: str = Depends(get_current_user)):
    """
    Restore a file from recycle bin to its original location
    Uses _original_parent field to determine destination
    """
    file_record = await file_service.get_file(current_user, file_id)
    if not file_record:
        raise HTTPException(404, "File not found")
    
    if file_record.get('parent_id') != 'recycle_bin':
        raise HTTPException(400, "File is not in recycle bin")
    
    original_parent = file_record.get('_original_parent', 'root')
    updated = await file_service.update_file(current_user, file_id, {
        'parent_id': original_parent or 'root',
        '_original_parent': ''
    })
    
    return {"message": "File restored", "file": updated}

@router.post("/recycle/empty")
async def empty_recycle_bin(current_user: str = Depends(get_current_user)):
    """
    Permanently delete all items in recycle bin for current user
    This is a hard delete operation - data cannot be recovered
    """
    count = await file_service.empty_recycle_bin(current_user)
    return {"message": "Recycle bin emptied", "deleted_count": count}
 
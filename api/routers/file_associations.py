from fastapi import APIRouter, Depends
from api.core.security import get_current_user
from api.core.google_sheets_db import sheets_db_manager
from typing import Dict

router = APIRouter(prefix="/file-associations", tags=["file-associations"])

@router.get("/")
async def get_associations(current_user: str = Depends(get_current_user)):
    records = sheets_db_manager.file_associations_db.find_by_field("user_id", current_user)
    return {r["extension"]: r["app_name"] for r in records}

@router.post("/")
async def set_association(ext: str, app: str, current_user: str = Depends(get_current_user)):
    # Remove old association for this extension
    existing = sheets_db_manager.file_associations_db.find_by_field("user_id", current_user)
    for rec in existing:
        if rec["extension"] == ext:
            sheets_db_manager.file_associations_db.delete(rec["id"])
    # Create new
    sheets_db_manager.file_associations_db.insert({
        "id": None,
        "user_id": current_user,
        "extension": ext,
        "app_name": app
    })
    return {"message": "Saved"}
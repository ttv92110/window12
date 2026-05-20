from fastapi import APIRouter, Depends
from api.core.security import get_current_user
from api.services.settings_service import settings_service
from api.models.schemas import SettingUpdate

router = APIRouter(prefix="/settings", tags=["settings"])

@router.get("/")
async def get_settings(current_user: str = Depends(get_current_user)):
    return await settings_service.get_settings(current_user)

@router.put("/")
async def update_settings(upd: SettingUpdate, current_user: str = Depends(get_current_user)):
    updates = upd.dict(exclude_unset=True)
    await settings_service.update_settings(current_user, updates)
    return {"message": "ok"}
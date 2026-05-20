from fastapi import APIRouter, Depends
from api.core.security import get_current_user
from api.services.app_service import app_service

router = APIRouter(prefix="/apps", tags=["apps"])

@router.get("/")
async def get_installed_apps(current_user: str = Depends(get_current_user)):
    return await app_service.get_installed_apps(current_user)

@router.post("/")
async def install_app(app_name: str, current_user: str = Depends(get_current_user)):
    return await app_service.install_app(current_user, app_name)
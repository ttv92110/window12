from fastapi import APIRouter, Depends
from api.core.security import get_current_user
from api.services.notification_service import notification_service
from api.models.schemas import NotificationItem

router = APIRouter(prefix="/notifications", tags=["notifications"])

@router.get("/")
async def get_notifications(current_user: str = Depends(get_current_user)):
    return await notification_service.get_notifications(current_user)

@router.post("/")
async def add_notification(notif: NotificationItem, current_user: str = Depends(get_current_user)):
    created = await notification_service.add_notification(current_user, notif.dict())
    return {"id": created["id"]}
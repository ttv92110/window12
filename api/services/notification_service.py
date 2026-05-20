from api.repositories.notification_repo import notification_repo
from api.routers.websocket import broadcast_notification
from typing import List, Dict

class NotificationService:
    async def get_notifications(self, user_id: str) -> List[Dict]:
        return notification_repo.get_all(user_id)

    async def add_notification(self, user_id: str, notif_data: Dict) -> Dict:
        created = notification_repo.create(user_id, notif_data)
        await broadcast_notification(user_id, {"title": created["title"], "message": created["message"]})
        return created

    # Optional: mark as read, delete, etc.

notification_service = NotificationService()
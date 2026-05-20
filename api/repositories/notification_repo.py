from api.core.google_sheets_db import sheets_db_manager
from api.core.repository import BaseRepository, SimpleCache
from typing import List, Dict, Optional
import uuid, datetime

cache = SimpleCache(ttl=10)

class NotificationRepository(BaseRepository[Dict]):
    def get_all(self, user_id: str) -> List[Dict]:
        ck = f"notifs:all:{user_id}"
        cached = cache.get(ck)
        if cached:
            return cached
        notifs = sheets_db_manager.notifications_db.find_by_field("user_id", user_id)
        cache.set(ck, notifs)
        return notifs

    def get_by_id(self, user_id: str, id: str) -> Optional[Dict]:
        n = sheets_db_manager.notifications_db.find_by_id(id)
        if n and n["user_id"] == user_id:
            return n
        return None

    def create(self, user_id: str, item: Dict) -> Dict:
        now = datetime.datetime.utcnow().isoformat()
        notif = {
            "id": item.get("id", str(uuid.uuid4())),
            "user_id": user_id,
            "title": item.get("title", ""),
            "message": item.get("message", ""),
            "read": item.get("read", "False"),
            "created_at": now
        }
        sheets_db_manager.notifications_db.insert(notif)
        cache.invalidate(f"notifs:all:{user_id}")
        return notif

    def update(self, user_id: str, id: str, updates: Dict) -> Optional[Dict]:
        n = self.get_by_id(user_id, id)
        if not n:
            return None
        sheets_db_manager.notifications_db.update(id, updates)
        cache.invalidate(f"notifs:all:{user_id}")
        return self.get_by_id(user_id, id)

    def delete(self, user_id: str, id: str) -> bool:
        n = self.get_by_id(user_id, id)
        if not n:
            return False
        sheets_db_manager.notifications_db.delete(id)
        cache.invalidate(f"notifs:all:{user_id}")
        return True

notification_repo = NotificationRepository()
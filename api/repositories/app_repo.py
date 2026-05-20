from api.core.google_sheets_db import sheets_db_manager
from api.core.repository import BaseRepository, SimpleCache
from typing import List, Dict, Optional
import uuid, datetime

cache = SimpleCache(ttl=60)

class AppRepository(BaseRepository[Dict]):
    def get_all(self, user_id: str) -> List[Dict]:
        ck = f"apps:all:{user_id}"
        cached = cache.get(ck)
        if cached:
            return cached
        apps = sheets_db_manager.apps_db.find_by_field("user_id", user_id)
        cache.set(ck, apps)
        return apps

    def get_by_id(self, user_id: str, id: str) -> Optional[Dict]:
        a = sheets_db_manager.apps_db.find_by_id(id)
        if a and a["user_id"] == user_id:
            return a
        return None

    def create(self, user_id: str, item: Dict) -> Dict:
        app = {
            "id": item.get("id", str(uuid.uuid4())),
            "user_id": user_id,
            "app_name": item["app_name"],
            "status": item.get("status", "installed")
        }
        sheets_db_manager.apps_db.insert(app)
        cache.invalidate(f"apps:all:{user_id}")
        return app

    def update(self, user_id: str, id: str, updates: Dict) -> Optional[Dict]:
        a = self.get_by_id(user_id, id)
        if not a:
            return None
        sheets_db_manager.apps_db.update(id, updates)
        cache.invalidate(f"apps:all:{user_id}")
        return self.get_by_id(user_id, id)

    def delete(self, user_id: str, id: str) -> bool:
        a = self.get_by_id(user_id, id)
        if not a:
            return False
        sheets_db_manager.apps_db.delete(id)
        cache.invalidate(f"apps:all:{user_id}")
        return True

app_repo = AppRepository()
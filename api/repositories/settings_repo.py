from api.core.google_sheets_db import sheets_db_manager
from api.core.repository import BaseRepository, SimpleCache
from typing import List, Dict, Optional
import uuid, datetime

cache = SimpleCache(ttl=30)

class SettingsRepository(BaseRepository[Dict]):
    def get_all(self, user_id: str) -> List[Dict]:
        return sheets_db_manager.settings_db.find_by_field("user_id", user_id)

    def get_by_id(self, user_id: str, id: str) -> Optional[Dict]:
        s = sheets_db_manager.settings_db.find_by_id(id)
        if s and s["user_id"] == user_id:
            return s
        return None

    def get_by_user(self, user_id: str) -> Optional[Dict]:
        settings_list = self.get_all(user_id)
        return settings_list[0] if settings_list else None


    def create(self, user_id: str, item: Dict) -> Dict:
        now = datetime.datetime.utcnow().isoformat()
        s = {
            "id": item.get("id", str(uuid.uuid4())),
            "user_id": user_id,
            "wallpaper": item.get("wallpaper", ""),
            "theme": item.get("theme", "dark"),
            "transparency": item.get("transparency", "True"),
            "accent_color": item.get("accent_color", "#60a5fa"),      # NEW
            "snap_enabled": item.get("snap_enabled", "True"),         # NEW
            "taskbar_autohide": item.get("taskbar_autohide", "False"), # NEW
            "windows_layout": item.get("windows_layout", "[]"),
            "workspaces": item.get("workspaces", "[]"),
            "created_at": now,
            "updated_at": now
        }
        sheets_db_manager.settings_db.insert(s)
        cache.invalidate(f"settings:{user_id}")
        return s

    def update(self, user_id: str, id: str, updates: Dict) -> Optional[Dict]:
        s = self.get_by_id(user_id, id)
        if not s:
            return None
        # Only update fields that are present
        for key in ["wallpaper", "theme", "transparency", "windows_layout", "workspaces"]:
            if key in updates:
                s[key] = updates[key]
        s["updated_at"] = datetime.datetime.utcnow().isoformat()
        sheets_db_manager.settings_db.update(id, s)
        cache.invalidate(f"settings:{user_id}")
        return self.get_by_id(user_id, id)
    
    def delete(self, user_id: str, id: str) -> bool:
        s = self.get_by_id(user_id, id)
        if not s:
            return False
        sheets_db_manager.settings_db.delete(id)
        cache.invalidate(f"settings:{user_id}")
        return True

settings_repo = SettingsRepository()
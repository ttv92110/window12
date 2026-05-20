from api.core.google_sheets_db import sheets_db_manager
from api.core.repository import BaseRepository, SimpleCache
from typing import List, Dict, Optional
import uuid, datetime

from api.utils.mime_detector import get_mime_from_extension
from ..routers.websocket import broadcast_file_change

cache = SimpleCache(ttl=5)  # files change often

class FileRepository(BaseRepository[Dict]):
    def get_all(self, user_id: str) -> List[Dict]:
        cache_key = f"files:all:{user_id}"
        cached = cache.get(cache_key)
        if cached:
            return cached
        files = sheets_db_manager.files_db.find_by_field("user_id", user_id)
        cache.set(cache_key, files)
        return files

    def get_by_id(self, user_id: str, id: str) -> Optional[Dict]:
        f = sheets_db_manager.files_db.find_by_id(id)
        if f and f["user_id"] == user_id:
            return f
        return None

    def create(self, user_id: str, item: Dict) -> Dict:
        now = datetime.datetime.utcnow().isoformat()
        name = item.get("name", "")
        extension = item.get("extension") or (name[name.rfind("."):].lower() if "." in name else "")
        mime_type = item.get("mime_type") or get_mime_from_extension(name)
        file = {
            "id": item.get("id", str(uuid.uuid4())),
            "user_id": user_id,
            "name": name,
            "type": item["type"],
            "parent_id": item.get("parent_id", "root"),
            "content": item.get("content", ""),
            "extension": extension,
            "mime_type": mime_type,
            "size": str(len(item.get("content", ""))),
            "created_at": now,
            "updated_at": now
        }
        sheets_db_manager.files_db.insert(file)
        cache.invalidate(f"files:all:{user_id}")
        return file

    def update(self, user_id: str, id: str, updates: Dict) -> Optional[Dict]:
        f = self.get_by_id(user_id, id)
        if not f:
            return None
        updates["updated_at"] = datetime.datetime.utcnow().isoformat()
        sheets_db_manager.files_db.update(id, updates)
        cache.invalidate(f"files:all:{user_id}") 
        return self.get_by_id(user_id, id)

    def delete(self, user_id: str, id: str) -> bool:
        f = self.get_by_id(user_id, id)
        if not f:
            return False
        sheets_db_manager.files_db.delete(id)
        cache.invalidate(f"files:all:{user_id}") 
        return True

file_repo = FileRepository() 
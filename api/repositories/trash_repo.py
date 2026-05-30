from api.core.google_sheets_db import sheets_db_manager
from api.core.repository import BaseRepository, SimpleCache
from typing import List, Dict, Optional
import uuid
import datetime

cache = SimpleCache(ttl=10)

class TrashRepository(BaseRepository[Dict]):
    def get_all(self, user_id: str) -> List[Dict]:
        return sheets_db_manager.trash_db.find_by_field("user_id", user_id)

    def get_by_id(self, user_id: str, id: str) -> Optional[Dict]:
        item = sheets_db_manager.trash_db.find_by_id(id)
        return item if item and item.get("user_id") == user_id else None

    def create(self, user_id: str, item: Dict) -> Dict:
        now = datetime.datetime.utcnow().isoformat()
        record = {
            "id": item.get("id", str(uuid.uuid4())),
            "user_id": user_id,
            "original_parent_id": item["original_parent_id"],
            "original_name": item["original_name"],
            "original_type": item["original_type"],
            "content": item.get("content", ""),
            "extension": item.get("extension", ""),
            "mime_type": item.get("mime_type", ""),
            "size": item.get("size", ""),
            "deleted_at": now,
            "restorable": "True"
        }
        sheets_db_manager.trash_db.insert(record)
        cache.invalidate(f"trash:all:{user_id}")
        return record

    def update(self, user_id: str, id: str, updates: Dict) -> Optional[Dict]:
        """Update a trash item (e.g., mark not restorable). Not commonly used."""
        item = self.get_by_id(user_id, id)
        if not item:
            return None
        # Merge updates
        item.update(updates)
        sheets_db_manager.trash_db.update(id, item)
        cache.invalidate(f"trash:all:{user_id}")
        return item

    def delete(self, user_id: str, id: str) -> bool:
        """Permanently delete a trash item (override abstract method)."""
        item = self.get_by_id(user_id, id)
        if not item:
            return False
        sheets_db_manager.trash_db.delete(id)
        cache.invalidate(f"trash:all:{user_id}")
        return True

    # Custom methods below
    def delete_permanently(self, user_id: str, id: str) -> bool:
        """Alias for delete (clearer naming)."""
        return self.delete(user_id, id)

    def empty_trash(self, user_id: str) -> int:
        items = self.get_all(user_id)
        for item in items:
            sheets_db_manager.trash_db.delete(item["id"])
        cache.invalidate(f"trash:all:{user_id}")
        return len(items)

# Singleton
trash_repo = TrashRepository()
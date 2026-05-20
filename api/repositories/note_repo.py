from api.core.google_sheets_db import sheets_db_manager
from api.core.repository import BaseRepository, SimpleCache
from typing import List, Dict, Optional
import uuid, datetime

cache = SimpleCache(ttl=5)

class NoteRepository(BaseRepository[Dict]):
    def get_all(self, user_id: str) -> List[Dict]:
        ck = f"notes:all:{user_id}"
        cached = cache.get(ck)
        if cached:
            return cached
        notes = sheets_db_manager.notes_db.find_by_field("user_id", user_id)
        cache.set(ck, notes)
        return notes

    def get_by_id(self, user_id: str, id: str) -> Optional[Dict]:
        n = sheets_db_manager.notes_db.find_by_id(id)
        if n and n["user_id"] == user_id:
            return n
        return None

    def create(self, user_id: str, item: Dict) -> Dict:
        now = datetime.datetime.utcnow().isoformat()
        note = {
            "id": item.get("id", str(uuid.uuid4())),
            "user_id": user_id,
            "title": item.get("title", ""),
            "body": item.get("body", ""),
            "created_at": now,
            "updated_at": now
        }
        sheets_db_manager.notes_db.insert(note)
        cache.invalidate(f"notes:all:{user_id}")
        return note

    def update(self, user_id: str, id: str, updates: Dict) -> Optional[Dict]:
        n = self.get_by_id(user_id, id)
        if not n:
            return None
        updates["updated_at"] = datetime.datetime.utcnow().isoformat()
        sheets_db_manager.notes_db.update(id, updates)
        cache.invalidate(f"notes:all:{user_id}")
        return self.get_by_id(user_id, id)

    def delete(self, user_id: str, id: str) -> bool:
        n = self.get_by_id(user_id, id)
        if not n:
            return False
        sheets_db_manager.notes_db.delete(id)
        cache.invalidate(f"notes:all:{user_id}")
        return True

note_repo = NoteRepository()
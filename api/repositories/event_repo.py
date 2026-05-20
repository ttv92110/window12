from api.core.google_sheets_db import sheets_db_manager
from api.core.repository import BaseRepository, SimpleCache
from typing import List, Dict, Optional
import uuid, datetime

cache = SimpleCache(ttl=10)

class EventRepository(BaseRepository[Dict]):
    def get_all(self, user_id: str) -> List[Dict]:
        ck = f"events:all:{user_id}"
        cached = cache.get(ck)
        if cached:
            return cached
        events = sheets_db_manager.events_db.find_by_field("user_id", user_id)
        cache.set(ck, events)
        return events

    def get_by_id(self, user_id: str, id: str) -> Optional[Dict]:
        e = sheets_db_manager.events_db.find_by_id(id)
        if e and e["user_id"] == user_id:
            return e
        return None

    def create(self, user_id: str, item: Dict) -> Dict:
        now = datetime.datetime.utcnow().isoformat()
        event = {
            "id": item.get("id", str(uuid.uuid4())),
            "user_id": user_id,
            "title": item["title"],
            "description": item.get("description", ""),
            "start_datetime": item["start_datetime"],
            "end_datetime": item["end_datetime"],
            "reminder": str(item.get("reminder", False)),
            "created_at": now
        }
        sheets_db_manager.events_db.insert(event)
        cache.invalidate(f"events:all:{user_id}")
        return event

    def update(self, user_id: str, id: str, updates: Dict) -> Optional[Dict]:
        e = self.get_by_id(user_id, id)
        if not e:
            return None
        updates["updated_at"] = datetime.datetime.utcnow().isoformat()
        sheets_db_manager.events_db.update(id, updates)
        cache.invalidate(f"events:all:{user_id}")
        return self.get_by_id(user_id, id)

    def delete(self, user_id: str, id: str) -> bool:
        e = self.get_by_id(user_id, id)
        if not e:
            return False
        sheets_db_manager.events_db.delete(id)
        cache.invalidate(f"events:all:{user_id}")
        return True

event_repo = EventRepository()
from api.core.google_sheets_db import sheets_db_manager
from api.core.repository import BaseRepository, SimpleCache
from typing import List, Dict, Optional
import uuid, datetime

cache = SimpleCache(ttl=5)

class ConversationRepository(BaseRepository[Dict]):
    def get_all(self, user_id: str) -> List[Dict]:
        ck = f"conversations:all:{user_id}"
        cached = cache.get(ck)
        if cached:
            return cached
        history = sheets_db_manager.conversations_db.find_by_field("user_id", user_id)
        cache.set(ck, history)
        return history

    def get_by_id(self, user_id: str, id: str) -> Optional[Dict]:
        m = sheets_db_manager.conversations_db.find_by_id(id)
        if m and m["user_id"] == user_id:
            return m
        return None

    def create(self, user_id: str, item: Dict) -> Dict:
        now = datetime.datetime.utcnow().isoformat()
        msg = {
            "id": item.get("id", str(uuid.uuid4())),
            "user_id": user_id,
            "role": item["role"],          # "user" or "assistant"
            "content": item["content"],
            "created_at": now
        }
        sheets_db_manager.conversations_db.insert(msg)
        cache.invalidate(f"conversations:all:{user_id}")
        return msg

    def update(self, user_id: str, id: str, updates: Dict) -> Optional[Dict]:
        msg = self.get_by_id(user_id, id)
        if not msg:
            return None
        sheets_db_manager.conversations_db.update(id, updates)
        cache.invalidate(f"conversations:all:{user_id}")
        return self.get_by_id(user_id, id)

    def delete(self, user_id: str, id: str) -> bool:
        msg = self.get_by_id(user_id, id)
        if not msg:
            return False
        sheets_db_manager.conversations_db.delete(id)
        cache.invalidate(f"conversations:all:{user_id}")
        return True

    def delete_all(self, user_id: str):
        history = self.get_all(user_id)
        for m in history:
            sheets_db_manager.conversations_db.delete(m["id"])
        cache.invalidate(f"conversations:all:{user_id}")

conversation_repo = ConversationRepository()
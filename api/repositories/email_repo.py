from api.core.google_sheets_db import sheets_db_manager
from api.core.repository import BaseRepository, SimpleCache
from typing import List, Dict, Optional
import uuid, datetime

cache = SimpleCache(ttl=5)

class EmailRepository(BaseRepository[Dict]):
    def get_all(self, user_id: str) -> List[Dict]:
        ck = f"emails:all:{user_id}"
        cached = cache.get(ck)
        if cached:
            return cached
        # Return all emails where user is either sender or recipient
        all_emails = sheets_db_manager.emails_db.read_all()
        user_emails = [e for e in all_emails if e.get("user_id") == user_id or e.get("recipient") == user_id]
        cache.set(ck, user_emails)
        return user_emails

    def get_by_id(self, user_id: str, id: str) -> Optional[Dict]:
        e = sheets_db_manager.emails_db.find_by_id(id)
        if e and (e["user_id"] == user_id or e.get("recipient") == user_id):
            return e
        return None

    def create(self, user_id: str, item: Dict) -> Dict:
        now = datetime.datetime.utcnow().isoformat()
        email = {
            "id": item.get("id", str(uuid.uuid4())),
            "user_id": user_id,
            "sender": item["sender"],
            "recipient": item["recipient"],
            "subject": item["subject"],
            "body": item.get("body", ""),
            "read": "False",
            "folder": item.get("folder", "inbox"),
            "created_at": now
        }
        sheets_db_manager.emails_db.insert(email)
        cache.invalidate(f"emails:all:{user_id}")
        return email

    def update(self, user_id: str, id: str, updates: Dict) -> Optional[Dict]:
        e = self.get_by_id(user_id, id)
        if not e:
            return None
        sheets_db_manager.emails_db.update(id, updates)
        cache.invalidate(f"emails:all:{user_id}")
        return self.get_by_id(user_id, id)

    def delete(self, user_id: str, id: str) -> bool:
        e = self.get_by_id(user_id, id)
        if not e:
            return False
        sheets_db_manager.emails_db.delete(id)
        cache.invalidate(f"emails:all:{user_id}")
        return True

    def get_inbox(self, user_id: str) -> List[Dict]:
        all_emails = self.get_all(user_id)
        return [e for e in all_emails if e.get("folder") == "inbox" and e.get("recipient") == user_id]

    def get_sent(self, user_id: str) -> List[Dict]:
        all_emails = self.get_all(user_id)
        return [e for e in all_emails if e.get("folder") == "sent" and e["user_id"] == user_id]

email_repo = EmailRepository()
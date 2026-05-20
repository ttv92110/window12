from api.core.google_sheets_db import sheets_db_manager
from api.core.repository import BaseRepository, SimpleCache
from typing import List, Dict, Optional
import uuid, datetime

cache = SimpleCache(ttl=30)  # user data rarely changes

class UserRepository(BaseRepository[Dict]):
    def get_all(self, user_id: str = None) -> List[Dict]:
        # Not typically needed; but if called, return all (for admin)
        return sheets_db_manager.users_db.read_all()

    def get_by_id(self, user_id: str, id: str) -> Optional[Dict]:
        return sheets_db_manager.users_db.find_by_id(id)

    def get_by_username(self, username: str) -> Optional[Dict]:
        users = sheets_db_manager.users_db.read_all()
        for u in users:
            if u.get("username") == username:
                return u
        return None

    def create(self, user_id: str, item: Dict) -> Dict:
        # user_id ignored; we use username/password
        now = datetime.datetime.utcnow().isoformat()
        user = {
            "id": item.get("id", str(uuid.uuid4())),
            "username": item["username"],
            "password_hash": item["password_hash"],
            "full_name": item.get("full_name", ""),
            "created_at": now
        }
        sheets_db_manager.users_db.insert(user)
        cache.invalidate("users:")
        return user

    def update(self, user_id: str, id: str, updates: Dict) -> Optional[Dict]:
        u = self.get_by_id(user_id, id)
        if not u:
            return None
        updates["updated_at"] = datetime.datetime.utcnow().isoformat()
        sheets_db_manager.users_db.update(id, updates)
        cache.invalidate(f"users:{id}")
        return self.get_by_id(user_id, id)

    def delete(self, user_id: str, id: str) -> bool:
        u = self.get_by_id(user_id, id)
        if not u:
            return False
        sheets_db_manager.users_db.delete(id)
        cache.invalidate(f"users:{id}")
        return True
    
    def update_refresh_token(self, user_id: str, token: str):
        self.update(user_id, user_id, {"refresh_token": token})
        
    def get_all_users(self) -> List[Dict]:
        """Return all users (admin only, but we need it for token refresh)."""
        return sheets_db_manager.users_db.read_all()

    def find_by_refresh_token(self, token: str) -> Optional[Dict]:
        users = self.get_all_users()
        for u in users:
            if u.get("refresh_token") == token:
                return u
        return None
    
# Singleton instance
user_repo = UserRepository()
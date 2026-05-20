from api.core.google_sheets_db import sheets_db_manager
from api.core.repository import BaseRepository, SimpleCache
from typing import List, Dict, Optional
import uuid, datetime

cache = SimpleCache(ttl=10)

class PlaylistRepository(BaseRepository[Dict]):
    def get_all(self, user_id: str) -> List[Dict]:
        ck = f"playlists:all:{user_id}"
        cached = cache.get(ck)
        if cached:
            return cached
        playlists = sheets_db_manager.playlists_db.find_by_field("user_id", user_id)
        cache.set(ck, playlists)
        return playlists

    def get_by_id(self, user_id: str, id: str) -> Optional[Dict]:
        p = sheets_db_manager.playlists_db.find_by_id(id)
        if p and p["user_id"] == user_id:
            return p
        return None

    def create(self, user_id: str, item: Dict) -> Dict:
        now = datetime.datetime.utcnow().isoformat()
        playlist = {
            "id": item.get("id", str(uuid.uuid4())),
            "user_id": user_id,
            "name": item["name"],
            "file_ids_json": item.get("file_ids_json", "[]"),
            "created_at": now
        }
        sheets_db_manager.playlists_db.insert(playlist)
        cache.invalidate(f"playlists:all:{user_id}")
        return playlist

    def update(self, user_id: str, id: str, updates: Dict) -> Optional[Dict]:
        p = self.get_by_id(user_id, id)
        if not p:
            return None
        updates["updated_at"] = datetime.datetime.utcnow().isoformat()
        sheets_db_manager.playlists_db.update(id, updates)
        cache.invalidate(f"playlists:all:{user_id}")
        return self.get_by_id(user_id, id)

    def delete(self, user_id: str, id: str) -> bool:
        p = self.get_by_id(user_id, id)
        if not p:
            return False
        sheets_db_manager.playlists_db.delete(id)
        cache.invalidate(f"playlists:all:{user_id}")
        return True

playlist_repo = PlaylistRepository()
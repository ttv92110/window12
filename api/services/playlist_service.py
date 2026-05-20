from api.repositories.playlist_repo import playlist_repo
from typing import List, Dict, Optional

class PlaylistService:
    async def get_all(self, user_id: str) -> List[Dict]:
        return playlist_repo.get_all(user_id)

    async def get_by_id(self, user_id: str, id: str) -> Optional[Dict]:
        return playlist_repo.get_by_id(user_id, id)

    async def create(self, user_id: str, data: Dict) -> Dict:
        return playlist_repo.create(user_id, data)

    async def update(self, user_id: str, id: str, updates: Dict) -> Optional[Dict]:
        return playlist_repo.update(user_id, id, updates)

    async def delete(self, user_id: str, id: str) -> bool:
        return playlist_repo.delete(user_id, id)

playlist_service = PlaylistService()
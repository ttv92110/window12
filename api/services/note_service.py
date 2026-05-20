from api.repositories.note_repo import note_repo
from api.routers.websocket import broadcast_note_change
from typing import List, Dict, Optional

class NoteService:
    async def get_all_notes(self, user_id: str) -> List[Dict]:
        return note_repo.get_all(user_id)

    async def get_note(self, user_id: str, note_id: str) -> Optional[Dict]:
        return note_repo.get_by_id(user_id, note_id)

    async def create_note(self, user_id: str, note_data: Dict) -> Dict:
        created = note_repo.create(user_id, note_data)
        await broadcast_note_change(user_id, "created", created)
        return created

    async def update_note(self, user_id: str, note_id: str, updates: Dict) -> Optional[Dict]:
        updated = note_repo.update(user_id, note_id, updates)
        if updated:
            updated_full = note_repo.get_by_id(user_id, note_id)
            if updated_full:
                await broadcast_note_change(user_id, "updated", updated_full)
        return updated

    async def delete_note(self, user_id: str, note_id: str) -> bool:
        success = note_repo.delete(user_id, note_id)
        if success:
            await broadcast_note_change(user_id, "deleted", {"id": note_id})
        return success

note_service = NoteService()
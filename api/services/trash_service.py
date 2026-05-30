from api.repositories.trash_repo import trash_repo
from api.repositories.file_repo import file_repo
from typing import List, Dict

class TrashService:
    async def get_all(self, user_id: str) -> List[Dict]:
        return trash_repo.find_by_field("user_id", user_id)

    async def restore(self, user_id: str, item_id: str) -> bool:
        item = trash_repo.find_by_id(item_id)
        if not item or item["user_id"] != user_id:
            return False
        # Restore to original parent
        restored = file_repo.create(user_id, {
            "id": item["id"],   # keep same ID
            "name": item["original_name"],
            "type": item["original_type"],
            "parent_id": item["original_parent_id"],
            "content": item.get("content", ""),
            "extension": item.get("extension", ""),
            "mime_type": item.get("mime_type", ""),
            "size": item.get("size", "0")
        })
        trash_repo.delete(item_id)
        return True

    async def empty(self, user_id: str):
        items = trash_repo.find_by_field("user_id", user_id)
        for it in items:
            trash_repo.delete(it["id"])

    async def permanent_delete(self, user_id: str, item_id: str):
        trash_repo.delete(item_id)
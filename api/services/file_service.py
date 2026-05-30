from api.repositories.file_repo import file_repo
from api.routers.websocket import broadcast_file_change
from api.utils.mime_detector import get_mime_from_extension
from typing import List, Dict, Optional
from api.core.google_sheets_db import sheets_db_manager

class FileService:
    async def get_all_files(self, user_id: str) -> List[Dict]:
        return file_repo.get_all(user_id)

    async def get_file(self, user_id: str, file_id: str) -> Optional[Dict]:
        return file_repo.get_by_id(user_id, file_id)

    async def create_file(self, user_id: str, file_data: Dict) -> Dict:
        name = file_data.get("name", "untitled")
        file_data["extension"] = name[name.rfind("."):].lower() if "." in name else ""
        file_data["mime_type"] = file_data.get("mime_type") or get_mime_from_extension(name)
        created = file_repo.create(user_id, file_data)
        await broadcast_file_change(user_id, "created", created)
        return created

    async def update_file(self, user_id: str, file_id: str, updates: Dict) -> Optional[Dict]:
        updated = file_repo.update(user_id, file_id, updates)
        
        file_record = self.get_file(user_id, file_id)
        if not file_record:
            return None
        
        # Store original parent before soft delete
        if updates.get('parent_id') == 'recycle_bin' and '_original_parent' not in updates:
            updates['_original_parent'] = file_record.get('parent_id', 'root')
        if updated:
            updated_full = file_repo.get_by_id(user_id, file_id)
            if updated_full:
                await broadcast_file_change(user_id, "updated", updated_full)
        
        # Store original parent before soft delete
        if updates.get('parent_id') == 'recycle_bin' and '_original_parent' not in updates:
            updates['_original_parent'] = file_record.get('parent_id', 'root')
        
        return updated, sheets_db_manager.files_db.update(file_id, updates)
     

    async def delete_file(self, user_id: str, file_id: str) -> bool:
        success = file_repo.delete(user_id, file_id)
        if success:
            await broadcast_file_change(user_id, "deleted", {"id": file_id})
        return success

    async def copy_file(self, user_id: str, file_id: str) -> Optional[Dict]:
        original = file_repo.get_by_id(user_id, file_id)
        if not original:
            return None
        new_file = {
            "name": original["name"] + " - Copy",
            "type": original["type"],
            "parent_id": original.get("parent_id", "root"),
            "content": original.get("content", ""),
            "extension": original.get("extension", ""),
            "mime_type": original.get("mime_type", ""),
        }
        created = file_repo.create(user_id, new_file)
        await broadcast_file_change(user_id, "created", created)
        return created
    
    async def get_recycle_bin_items(self, user_id: str):
        """Get all soft-deleted files for user"""
        all_files = sheets_db_manager.files_db.find_by_field('user_id', user_id)
        return [f for f in all_files if f.get('parent_id') == 'recycle_bin']
    
    async def empty_recycle_bin(self, user_id: str):
        """Permanently delete all items in recycle bin"""
        items = await self.get_recycle_bin_items(user_id)
        deleted_count = 0
        
        for item in items:
            try:
                sheets_db_manager.files_db.delete_hard(item['id'])
                deleted_count += 1
            except Exception as e:
                print(f"Error deleting {item['id']}: {e}")
        
        return deleted_count
    
    async def move_files(self, user_id: str, file_ids: List[str], target_parent_id: str):
        for fid in file_ids:
            self.file_repo.update(user_id, fid, {"parent_id": target_parent_id})
        await broadcast_file_change(user_id, "moved", {"ids": file_ids, "target": target_parent_id})

    async def copy_files(self, user_id: str, file_ids: List[str], target_parent_id: str):
        new_ids = []
        for fid in file_ids:
            original = self.file_repo.get_by_id(user_id, fid)
            new = self.file_repo.create(user_id, {**original, "id": None, "name": original["name"] + " - Copy", "parent_id": target_parent_id})
            new_ids.append(new["id"])
        return new_ids
     


file_service = FileService()
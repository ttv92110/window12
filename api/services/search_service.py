from api.repositories.file_repo import file_repo
from api.repositories.note_repo import note_repo
from api.repositories.app_repo import app_repo
from typing import List, Dict

class SearchService:
    async def search(self, user_id: str, query: str) -> List[Dict]:
        q = query.lower().strip()
        results = []

        files = file_repo.get_all(user_id)
        for f in files:
            if q in f["name"].lower():
                results.append({
                    "type": "file",
                    "id": f["id"],
                    "name": f["name"],
                    "file_type": f.get("type", "file"),
                    "parent_id": f.get("parent_id", "root")
                })

        notes = note_repo.get_all(user_id)
        for n in notes:
            if q in n["title"].lower() or q in n["body"].lower():
                results.append({
                    "type": "note",
                    "id": n["id"],
                    "title": n["title"],
                    "body_preview": n["body"][:80] if n["body"] else ""
                })

        apps = app_repo.get_all(user_id)
        for a in apps:
            if q in a["app_name"].lower():
                results.append({
                    "type": "app",
                    "id": a["id"],
                    "name": a["app_name"]
                })

        return results[:20]

search_service = SearchService()
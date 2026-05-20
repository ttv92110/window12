from api.repositories.app_repo import app_repo
from typing import List, Dict, Optional

class AppService:
    async def get_installed_apps(self, user_id: str) -> List[Dict]:
        return app_repo.get_all(user_id)

    async def install_app(self, user_id: str, app_name: str) -> Dict:
        # Business logic: check if already installed (handled in router, but could be here)
        return app_repo.create(user_id, {"app_name": app_name, "status": "installed"})

    async def uninstall_app(self, user_id: str, app_name: str) -> bool:
        installed = app_repo.get_all(user_id)
        target = next((a for a in installed if a["app_name"] == app_name and a.get("status") == "installed"), None)
        if target:
            return app_repo.delete(user_id, target["id"])
        return False

app_service = AppService()
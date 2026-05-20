from api.repositories.settings_repo import settings_repo
from api.routers.websocket import broadcast_settings_change
from typing import Dict, Optional

class SettingsService:
    async def get_settings(self, user_id: str) -> Dict:
        settings_list = settings_repo.get_all(user_id)
        return settings_list[0] if settings_list else {}

    async def update_settings(self, user_id: str, updates: Dict) -> Dict:
        settings_list = settings_repo.get_all(user_id)
        if settings_list:
            record = settings_list[0]
            settings_repo.update(user_id, record["id"], updates)
        else:
            # Create new settings record if none exists
            settings_repo.create(user_id, updates)
        await broadcast_settings_change(user_id)
        return self.get_settings(user_id)

settings_service = SettingsService()
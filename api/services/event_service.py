from api.repositories.event_repo import event_repo
from api.repositories.notification_repo import notification_repo
from typing import List, Dict, Optional

class EventService:
    async def get_all(self, user_id: str) -> List[Dict]:
        return event_repo.get_all(user_id)

    async def get_by_id(self, user_id: str, event_id: str) -> Optional[Dict]:
        return event_repo.get_by_id(user_id, event_id)

    async def create(self, user_id: str, data: Dict) -> Dict:
        created = event_repo.create(user_id, data)
        # Create reminder notification if requested
        if data.get("reminder") and data["reminder"] != "False":
            notification_repo.create(user_id, {
                "title": f"Reminder: {created['title']}",
                "message": f"Event '{created['title']}' on {created['start_datetime']}",
                "read": "False"
            })
        return created

    async def update(self, user_id: str, event_id: str, updates: Dict) -> Optional[Dict]:
        return event_repo.update(user_id, event_id, updates)

    async def delete(self, user_id: str, event_id: str) -> bool:
        return event_repo.delete(user_id, event_id)

event_service = EventService()
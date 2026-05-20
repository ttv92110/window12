from api.repositories.email_repo import email_repo
from api.repositories.user_repo import user_repo
from api.repositories.notification_repo import notification_repo
from api.routers.websocket import broadcast_notification
from typing import List, Dict, Optional

class EmailService:
    async def get_all_emails(self, user_id: str) -> List[Dict]:
        return email_repo.get_all(user_id)

    async def get_inbox(self, user_id: str) -> List[Dict]:
        return email_repo.get_inbox(user_id)

    async def get_sent(self, user_id: str) -> List[Dict]:
        return email_repo.get_sent(user_id)

    async def get_email(self, user_id: str, email_id: str) -> Optional[Dict]:
        return email_repo.get_by_id(user_id, email_id)

    async def send_email(self, user_id: str, sender_username: str, data: Dict) -> Dict:
        # Store in sender's sent folder
        sent_email = email_repo.create(user_id, {
            "sender": sender_username,
            "recipient": data["recipient"],
            "subject": data["subject"],
            "body": data.get("body", ""),
            "folder": "sent"
        })

        # Try to find recipient user
        recipient_user = user_repo.get_by_username(data["recipient"])
        if recipient_user:
            recipient_id = recipient_user["id"]
            # Store in recipient's inbox
            inbox_email = email_repo.create(recipient_id, {
                "sender": sender_username,
                "recipient": data["recipient"],
                "subject": data["subject"],
                "body": data.get("body", ""),
                "folder": "inbox",
                "read": "False"
            })
            # Send real‑time notification to recipient
            notification_repo.create(recipient_id, {
                "title": f"New mail from {sender_username}",
                "message": data["subject"],
                "read": "False"
            })
            await broadcast_notification(recipient_id, {
                "title": f"New mail from {sender_username}",
                "message": data["subject"]
            })
        else:
            # Recipient not in system – just create a notification for the sender
            notification_repo.create(user_id, {
                "title": "Mail not delivered",
                "message": f"User '{data['recipient']}' not found",
                "read": "False"
            })
            await broadcast_notification(user_id, {
                "title": "Mail not delivered",
                "message": f"User '{data['recipient']}' not found"
            })
        return sent_email

    async def mark_as_read(self, user_id: str, email_id: str) -> Optional[Dict]:
        return email_repo.update(user_id, email_id, {"read": "True"})

    async def delete_email(self, user_id: str, email_id: str) -> bool:
        return email_repo.delete(user_id, email_id)

email_service = EmailService()
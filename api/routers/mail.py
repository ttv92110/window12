from fastapi import APIRouter, Depends, HTTPException
from api.core.security import get_current_user
from api.services.email_service import email_service
from api.models.schemas import EmailSend

router = APIRouter(prefix="/mail", tags=["mail"])

@router.get("/inbox")
async def get_inbox(current_user: str = Depends(get_current_user)):
    return await email_service.get_inbox(current_user)

@router.get("/sent")
async def get_sent(current_user: str = Depends(get_current_user)):
    return await email_service.get_sent(current_user)

@router.get("/{email_id}")
async def get_email(email_id: str, current_user: str = Depends(get_current_user)):
    email = await email_service.get_email(current_user, email_id)
    if not email:
        raise HTTPException(404, "Email not found")
    return email

@router.post("/send")
async def send_email(data: EmailSend, current_user: str = Depends(get_current_user)):
    # Get sender's username from user_id
    from api.repositories.user_repo import user_repo
    sender_user = user_repo.get_by_id(current_user, current_user)
    if not sender_user:
        raise HTTPException(401, "User not found")
    email = await email_service.send_email(current_user, sender_user["username"], data.dict())
    return {"message": "Sent", "id": email["id"]}

@router.put("/{email_id}/read")
async def mark_as_read(email_id: str, current_user: str = Depends(get_current_user)):
    updated = await email_service.mark_as_read(current_user, email_id)
    if not updated:
        raise HTTPException(404, "Email not found")
    return {"message": "Marked as read"}

@router.delete("/{email_id}")
async def delete_email(email_id: str, current_user: str = Depends(get_current_user)):
    if not await email_service.delete_email(current_user, email_id):
        raise HTTPException(404, "Email not found")
    return {"message": "Deleted"}

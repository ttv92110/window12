from fastapi import APIRouter, Depends
from api.core.security import get_current_user
from api.services.assistant_service import assistant_service
from pydantic import BaseModel

router = APIRouter(prefix="/assistant", tags=["assistant"])

class PromptRequest(BaseModel):
    prompt: str

@router.get("/history")
async def get_history(current_user: str = Depends(get_current_user)):
    return await assistant_service.get_history(current_user)

@router.post("/chat")
async def chat(request: PromptRequest, current_user: str = Depends(get_current_user)):
    result = await assistant_service.send_message(current_user, request.prompt)
    return {
        "reply": result["assistant"]["content"],
        "history_id": result["assistant"]["id"]
    }

@router.delete("/history")
async def clear_history(current_user: str = Depends(get_current_user)):
    await assistant_service.clear_history(current_user)
    return {"message": "History cleared"}
from fastapi import APIRouter, Depends, Query
from api.core.security import get_current_user
from api.services.search_service import search_service

router = APIRouter(prefix="/search", tags=["search"])

@router.get("/")
async def global_search(q: str = Query(..., min_length=1), current_user: str = Depends(get_current_user)):
    return await search_service.search(current_user, q)
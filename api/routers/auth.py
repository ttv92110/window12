from fastapi import APIRouter, HTTPException, Depends, Form, Request
from api.core.security import hash_password, verify_password, create_access_token, get_current_user
from api.repositories.user_repo import user_repo
from api.models.schemas import UserCreate
import uuid, datetime
from slowapi import Limiter
from slowapi.util import get_remote_address
limiter = Limiter(key_func=get_remote_address)
import secrets
from datetime import timedelta 

router = APIRouter(prefix="/auth", tags=["auth"])

@router.post("/signup")
@limiter.limit("5/minute")
async def signup(request: Request, user: UserCreate):
    existing = user_repo.get_by_username(user.username)
    if existing:
        raise HTTPException(400, "Username already exists")
    uid = str(uuid.uuid4())
    now = datetime.datetime.utcnow().isoformat()
    user_repo.create(None, {
        "id": uid,
        "username": user.username,
        "password_hash": hash_password(user.password),
        "full_name": user.full_name,
        "email": user.email,
        "created_at": now
    })
    token = create_access_token(data={"sub": uid})
    return {"access_token": token, "token_type": "bearer"}

@router.post("/login")
@limiter.limit("5/minute")
async def login(request: Request, username: str = Form(...), password: str = Form(...)):
    u = user_repo.get_by_username(username)
    if not u or not verify_password(password, u["password_hash"]):
        raise HTTPException(401, "Invalid credentials") 
    
    refresh_token = secrets.token_urlsafe(32)
    user_repo.update_refresh_token(u["id"], refresh_token)
    access_token = create_access_token(data={"sub": u["id"]})
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer"
    }

@router.get("/me") 
async def me(current_user: str = Depends(get_current_user)):
    u = user_repo.get_by_id(current_user, current_user)  # user_id = current_user
    if not u:
        raise HTTPException(404, "User not found")
    return {"id": u["id"], "username": u["username"], "full_name": u["full_name"]}

@router.post("/refresh")
async def refresh_access_token(refresh_token: str = Form(...)):
    user = user_repo.find_by_refresh_token(refresh_token)
    if not user:
        raise HTTPException(401, "Invalid refresh token")
    new_access = create_access_token(data={"sub": user["id"]})
    return {"access_token": new_access, "token_type": "bearer"}

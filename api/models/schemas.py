from pydantic import BaseModel
from typing import Optional 
from pydantic import Field, constr

class UserCreate(BaseModel):
    username: constr(min_length=3, max_length=30) 
    password: constr(min_length=6, max_length=72) 
    full_name: constr(min_length=1, max_length=50)
    email: str = ""

class TokenResponse(BaseModel):
    access_token: str
    token_type: str

class FileCreate(BaseModel):
    name: str
    type: str
    parent_id: Optional[str] = "root"
    content: Optional[str] = ""
    mime_type: Optional[str] = None
    extension: Optional[str] = None

class FileUpdate(BaseModel):
    name: Optional[str] = None
    content: Optional[str] = None

class NoteCreate(BaseModel):
    title: str
    body: str = ""

class NoteUpdate(BaseModel):
    title: Optional[str] = None
    body: Optional[str] = None

class SettingUpdate(BaseModel):
    wallpaper: Optional[str] = None
    theme: Optional[str] = None
    transparency: Optional[bool] = None
    windows_layout: Optional[str] = None   # JSON string
    workspaces: Optional[str] = None       # JSON string
    accent_color: Optional[str] = None       # NEW
    snap_enabled: Optional[bool] = None      # NEW
    taskbar_autohide: Optional[bool] = None  # NEW

class NotificationItem(BaseModel):
    title: str
    message: str

class EventCreate(BaseModel):
    title: str
    description: str = ""
    start_datetime: str
    end_datetime: str
    reminder: bool = False

class EventUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    start_datetime: Optional[str] = None
    end_datetime: Optional[str] = None
    reminder: Optional[bool] = None
    
class EmailSend(BaseModel):
    recipient: str
    subject: str
    body: str = ""
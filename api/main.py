from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pathlib import Path
import os

from .routers import auth, files, notes, settings, notifications, apps, websocket, search, store, music, calendar, mail, assistant

# ========== ONE FastAPI app ==========
app = FastAPI(title="Windows12 OS Backend")

# ========== CORS ==========
allowed_origins = os.getenv("ALLOWED_ORIGINS", "*")
if allowed_origins == "*":
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
else:
    origins = [o.strip() for o in allowed_origins.split(",")]
    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "DELETE"],
        allow_headers=["Authorization", "Content-Type"],
    )

# ========== Routers ==========
app.include_router(auth.router)
app.include_router(files.router)
app.include_router(notes.router)
app.include_router(settings.router)
app.include_router(notifications.router)
app.include_router(apps.router)
app.include_router(websocket.router)
app.include_router(search.router)
app.include_router(store.router)
app.include_router(music.router)
app.include_router(calendar.router)
app.include_router(mail.router)
app.include_router(assistant.router)

# ========== Static files & Vercel data directories ==========
BASE_DIR = Path(__file__).parent.parent.absolute()

DATA_DIR = Path("/tmp/data") if os.getenv("VERCEL") else BASE_DIR / "data"
DATA_DIR.mkdir(exist_ok=True, parents=True)
if os.getenv("VERCEL"):
    import shutil
    source_data = BASE_DIR / "data"
    if source_data.exists():
        for file in source_data.glob("*.json"):
            target = DATA_DIR / file.name
            if not target.exists():
                shutil.copy2(file, target)

API_DATA_DIR = Path("/tmp/api/data") if os.getenv("VERCEL") else BASE_DIR / "api/data"
API_DATA_DIR.mkdir(exist_ok=True, parents=True)
if os.getenv("VERCEL"):
    source_api_data = BASE_DIR / "api/data"
    if source_api_data.exists():
        for file in source_api_data.glob("*.json"):
            target = API_DATA_DIR / file.name
            if not target.exists():
                shutil.copy2(file, target)

os.environ["DATA_DIR"] = str(DATA_DIR)

# Mount static files
static_dir = BASE_DIR / "static"
if static_dir.exists():
    app.mount("/static", StaticFiles(directory=str(static_dir)), name="static")

# ========== Serve frontend ==========
TEMPLATES_DIR = BASE_DIR / "templates"
DESKTOP_HTML = TEMPLATES_DIR / "desktop.html"

@app.get("/")
async def root():
    if DESKTOP_HTML.exists():
        return FileResponse(DESKTOP_HTML)
    return {"message": "desktop.html not found"}

@app.get("/health")
async def health():
    from api.repositories.user_repo import user_repo
    try:
        user_repo.get_all_users()
        return {"db": "connected"}
    except Exception as e:
        return {"db": "error", "detail": str(e)}
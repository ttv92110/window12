from fastapi import APIRouter, Depends, HTTPException
from api.core.security import get_current_user
from api.repositories.app_repo import app_repo
import json
from pathlib import Path

router = APIRouter(prefix="/store", tags=["store"])

# Load the manifest once
MANIFEST_PATH = Path(__file__).parent.parent / "data" / "app_manifest.json"
with open(MANIFEST_PATH, "r", encoding="utf-8") as f:
    APP_MANIFEST = json.load(f)

@router.get("/apps")
async def get_store_apps(current_user: str = Depends(get_current_user)):
    """Return all available apps with install status for the current user."""
    installed = app_repo.get_all(current_user)
    installed_names = [a["app_name"] for a in installed if a.get("status") == "installed"]

    result = []
    for app in APP_MANIFEST:
        result.append({
            **app,
            "installed": app["app_name"] in installed_names
        })
    return result

@router.post("/install/{app_name}")
async def install_app(app_name: str, current_user: str = Depends(get_current_user)):
    # Check if app exists in manifest
    if not any(a["app_name"] == app_name for a in APP_MANIFEST):
        raise HTTPException(404, "App not found in store")

    # Check if already installed
    installed = app_repo.get_all(current_user)
    if any(a["app_name"] == app_name and a.get("status") == "installed" for a in installed):
        raise HTTPException(400, "App already installed")

    app_repo.create(current_user, {
        "app_name": app_name,
        "status": "installed"
    })
    return {"message": f"{app_name} installed"}

@router.delete("/uninstall/{app_name}")
async def uninstall_app(app_name: str, current_user: str = Depends(get_current_user)):
    installed = app_repo.get_all(current_user)
    target = next((a for a in installed if a["app_name"] == app_name and a.get("status") == "installed"), None)
    if not target:
        raise HTTPException(404, "App not installed")

    app_repo.delete(current_user, target["id"])
    return {"message": f"{app_name} uninstalled"}
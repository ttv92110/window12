import gspread
from google.oauth2.service_account import Credentials
from typing import List, Dict, Optional
from pathlib import Path
import json
import os
import uuid
from datetime import datetime
import time
import traceback

class GoogleSheetsDB:
    def __init__(self, sheet_name: str, worksheet_name: str):
        self.sheet_name = sheet_name
        self.worksheet_name = worksheet_name
        self._client = None
        self._worksheet = None
        self._cache = {}
        self._cache_expiry = 5
        # DO NOT connect here — fully lazy

    def _ensure_connected(self):
        """Connect once. If quota exceeded, retry with backoff."""
        if self._worksheet is not None:
            return

        attempts = 0
        max_attempts = 3
        while attempts < max_attempts:
            attempts += 1
            try:
                scopes = [
                    "https://www.googleapis.com/auth/spreadsheets",
                    "https://www.googleapis.com/auth/drive"
                ]
                creds_json = os.getenv("GOOGLE_SHEETS_CREDENTIALS")
                if creds_json:
                    creds_dict = json.loads(creds_json)
                    creds = Credentials.from_service_account_info(creds_dict, scopes=scopes)
                    self._client = gspread.authorize(creds)
                    print(f"✅ Connected using GOOGLE_SHEETS_CREDENTIALS")
                else:
                    base_dir = Path(__file__).parent
                    creds_file = base_dir / "credentials.json"
                    if not creds_file.exists():
                        print(f"❌ No credentials found.")
                        return
                    creds = Credentials.from_service_account_file(str(creds_file), scopes=scopes)
                    self._client = gspread.authorize(creds)
                    print(f"✅ Connected using credentials file: {creds_file}")

                spreadsheet = self._client.open(self.sheet_name)
                print(f"📊 Opened spreadsheet: {self.sheet_name}")

                try:
                    self._worksheet = spreadsheet.worksheet(self.worksheet_name)
                    print(f"📋 Worksheet '{self.worksheet_name}' found")
                except gspread.exceptions.WorksheetNotFound:
                    print(f"📋 Worksheet '{self.worksheet_name}' not found – creating...")
                    self._worksheet = spreadsheet.add_worksheet(
                        title=self.worksheet_name, rows="100", cols="20"
                    )
                    headers = self._get_default_headers()
                    if headers:
                        self._worksheet.append_row(headers)
                        print(f"📋 Added headers to '{self.worksheet_name}'")
                return  # success

            except Exception as e:
                err_str = str(e)
                if "429" in err_str:
                    wait = 2 ** attempts  # exponential backoff: 2, 4, 8 seconds
                    print(f"⏳ Quota hit — retrying in {wait}s...")
                    time.sleep(wait)
                else:
                    print(f"❌ Connection error: {traceback.format_exc()}")
                    self._worksheet = None
                    return

    def _get_default_headers(self):
        headers_map = {
            "users": ["id","username","password_hash","full_name","email","created_at","refresh_token"],
            "files": ["id","user_id","name","type","parent_id","content","extension","mime_type","size","created_at","updated_at"],
            "notes": ["id","user_id","title","body","created_at","updated_at"],
            "settings": ["id","user_id","wallpaper","theme","transparency","accent_color","snap_enabled","taskbar_autohide","windows_layout","workspaces","pinned_apps","icon_positions","volume_muted","created_at","updated_at"],
            "notifications": ["id","user_id","title","message","read","created_at"],
            "installed_apps": ["id","user_id","app_name","status"],
            "playlists": ["id","user_id","name","file_ids_json","created_at"],
            "events": ["id","user_id","title","description","start_datetime","end_datetime","reminder","created_at"],
            "emails": ["id","user_id","sender","recipient","subject","body","read","folder","created_at"],
            "conversations": ["id","user_id","role","content","created_at"],
        }
        return headers_map.get(self.worksheet_name)

    # ---------- CRUD ----------
    def read_all(self, force_refresh=False):
        self._ensure_connected()
        if not self._worksheet:
            return []
        cache_key = f"{self.sheet_name}:{self.worksheet_name}:all"
        now = time.time()
        if not force_refresh and cache_key in self._cache:
            data, timestamp = self._cache[cache_key]
            if now - timestamp < self._cache_expiry:
                return data
        try:
            records = self._worksheet.get_all_records()
            data = [dict(record) for record in records]
            self._cache[cache_key] = (data, now)
            return data
        except Exception as e:
            print(f"Error reading: {e}")
            if cache_key in self._cache:
                return self._cache[cache_key][0]
            return []

    def find_by_id(self, id: str) -> Optional[Dict]:
        for rec in self.read_all():
            if rec.get("id") == id:
                return rec
        return None

    def find_by_field(self, field: str, value: str) -> List[Dict]:
        return [r for r in self.read_all() if str(r.get(field)) == str(value)]

    def insert(self, record: Dict) -> Dict:
        self._ensure_connected()
        if not self._worksheet:
            return record
        if 'id' not in record:
            record['id'] = str(uuid.uuid4())
        if 'created_at' not in record:
            record['created_at'] = datetime.utcnow().isoformat()
        headers = self._worksheet.row_values(1)
        if not headers:
            headers = list(record.keys())
            self._worksheet.append_row(headers)
        row = [str(record.get(h, "")) for h in headers]
        self._worksheet.append_row(row)
        self._cache.clear()
        return record

    def update(self, id: str, updates: Dict) -> Optional[Dict]:
        self._ensure_connected()
        if not self._worksheet:
            return None
        headers = self._worksheet.row_values(1)
        records = self.read_all()
        for idx, rec in enumerate(records, start=2):
            if rec.get("id") == id:
                rec.update(updates)
                rec['updated_at'] = datetime.utcnow().isoformat()
                for col_idx, h in enumerate(headers, start=1):
                    self._worksheet.update_cell(idx, col_idx, str(rec.get(h, "")))
                self._cache.clear()
                return rec
        return None

    def delete(self, id: str) -> bool:
        self._ensure_connected()
        if not self._worksheet:
            return False
        records = self.read_all()
        for idx, rec in enumerate(records, start=2):
            if rec.get("id") == id:
                self._worksheet.delete_rows(idx)
                self._cache.clear()
                return True
        return False


class GoogleSheetsDBManager:
    def __init__(self, spreadsheet_name: str = "Windows12OS"):
        # Create instances but DO NOT connect
        self.users_db = GoogleSheetsDB(spreadsheet_name, "users")
        self.files_db = GoogleSheetsDB(spreadsheet_name, "files")
        self.notes_db = GoogleSheetsDB(spreadsheet_name, "notes")
        self.settings_db = GoogleSheetsDB(spreadsheet_name, "settings")
        self.notifications_db = GoogleSheetsDB(spreadsheet_name, "notifications")
        self.apps_db = GoogleSheetsDB(spreadsheet_name, "installed_apps")
        self.playlists_db = GoogleSheetsDB(spreadsheet_name, "playlists")
        self.events_db = GoogleSheetsDB(spreadsheet_name, "events")
        self.emails_db = GoogleSheetsDB(spreadsheet_name, "emails")
        self.conversations_db = GoogleSheetsDB(spreadsheet_name, "conversations")

sheets_db_manager = GoogleSheetsDBManager()
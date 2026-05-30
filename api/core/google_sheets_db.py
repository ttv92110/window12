import gspread
from google.oauth2.service_account import Credentials
from typing import List, Dict, Optional
from pathlib import Path
import json
import os
import uuid
from datetime import datetime, timedelta
import time
import traceback
from collections import defaultdict

class GoogleSheetsDB:
    def __init__(self, sheet_name: str, worksheet_name: str, connect_eagerly=False):
        self.sheet_name = sheet_name
        self.worksheet_name = worksheet_name
        self._client = None
        self._worksheet = None
        
        # ==================== ENHANCED CACHING ENGINE ====================
        self._cache = {}
        self._cache_expiry = 10  # Cache for 10 seconds instead of 5
        self._bulk_operations = []  # Queue for batching operations
        self._last_full_refresh = None
        
        if connect_eagerly:
            self._ensure_connected()

    def _ensure_connected(self):
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
                return
            except Exception as e:
                err_str = str(e)
                if "429" in err_str:
                    wait = 2 ** attempts
                    print(f"⏳ Quota hit – retrying in {wait}s...")
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

    # ==================== ENHANCED CRUD OPERATIONS ====================
    def read_all(self, force_refresh=False, exclude_deleted=False):
        """Read all records with intelligent caching"""
        self._ensure_connected()
        if not self._worksheet:
            return []
        
        cache_key = f"{self.sheet_name}:{self.worksheet_name}:all"
        now = time.time()
        
        # Return cached data if still valid
        if not force_refresh and cache_key in self._cache:
            data, timestamp = self._cache[cache_key]
            if now - timestamp < self._cache_expiry:
                if exclude_deleted:
                    return [r for r in data if r.get('parent_id') != 'recycle_bin']
                return data
        
        try:
            records = self._worksheet.get_all_records()
            data = [dict(record) for record in records]
            
            # Clean up old cache entries periodically
            if len(self._cache) > 50:
                oldest_key = min(self._cache.keys(), key=lambda k: self._cache[k][1])
                del self._cache[oldest_key]
            
            self._cache[cache_key] = (data, now)
            
            if exclude_deleted:
                return [r for r in data if r.get('parent_id') != 'recycle_bin']
            return data
        except Exception as e:
            print(f"❌ Error reading {self.worksheet_name}: {e}")
            # Return cached data if available, even if expired
            if cache_key in self._cache:
                data = self._cache[cache_key][0]
                if exclude_deleted:
                    return [r for r in data if r.get('parent_id') != 'recycle_bin']
                return data
            return []

    def find_by_id(self, id: str, exclude_deleted=False):
        """Find record by ID with optional soft-delete exclusion"""
        for rec in self.read_all(exclude_deleted=exclude_deleted):
            if rec.get("id") == id:
                return rec
        return None

    def find_by_field(self, field: str, value: str, exclude_deleted=False):
        """Find records by field value"""
        records = self.read_all(exclude_deleted=exclude_deleted)
        return [r for r in records if str(r.get(field)) == str(value)]
    
    def find_by_parent(self, parent_id: str, exclude_deleted=False):
        """Find all files with given parent_id - optimized for hierarchy traversal"""
        records = self.read_all(exclude_deleted=exclude_deleted)
        return [r for r in records if str(r.get('parent_id')) == str(parent_id)]

    def insert(self, record: Dict):
        """Insert new record"""
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
        self._cache.clear()  # Invalidate cache
        return record

    def insert_batch(self, records: List[Dict]):
        """Batch insert multiple records (more efficient)"""
        self._ensure_connected()
        if not self._worksheet or not records:
            return records
        
        for record in records:
            if 'id' not in record:
                record['id'] = str(uuid.uuid4())
            if 'created_at' not in record:
                record['created_at'] = datetime.utcnow().isoformat()
        
        headers = self._worksheet.row_values(1)
        if not headers:
            headers = list(records[0].keys())
            self._worksheet.append_row(headers)
        
        rows = [[str(r.get(h, "")) for h in headers] for r in records]
        self._worksheet.append_rows(rows)
        self._cache.clear()
        return records

    def update(self, id: str, updates: Dict):
        """Update record by ID"""
        self._ensure_connected()
        if not self._worksheet:
            return None
        
        headers = self._worksheet.row_values(1)
        records = self.read_all(force_refresh=True)
        
        for idx, rec in enumerate(records, start=2):
            if rec.get("id") == id:
                rec.update(updates)
                rec['updated_at'] = datetime.utcnow().isoformat()
                for col_idx, h in enumerate(headers, start=1):
                    self._worksheet.update_cell(idx, col_idx, str(rec.get(h, "")))
                self._cache.clear()
                return rec
        return None

    def delete_hard(self, id: str):
        """Permanently delete record (hard delete)"""
        self._ensure_connected()
        if not self._worksheet:
            return False
        
        records = self.read_all(force_refresh=True)
        for idx, rec in enumerate(records, start=2):
            if rec.get("id") == id:
                self._worksheet.delete_rows(idx)
                self._cache.clear()
                return True
        return False
    
    def delete_soft(self, id: str, original_parent_id: str = None):
        """Soft delete: move to recycle bin instead of hard delete"""
        # Soft deletion is implemented as parent_id = 'recycle_bin'
        # This preserves data for recovery while hiding from normal views
        return self.update(id, {
            'parent_id': 'recycle_bin',
            '_original_parent': original_parent_id or '',  # Store original location for restore
        })
    
    def restore_from_recycle(self, id: str):
        """Restore file from recycle bin"""
        rec = self.find_by_id(id, exclude_deleted=False)
        if not rec:
            return None
        
        original_parent = rec.get('_original_parent', 'root')
        return self.update(id, {
            'parent_id': original_parent or 'root',
            '_original_parent': '',
        })
    
    def empty_recycle_bin(self, user_id: str = None):
        """Permanently delete all items in recycle bin"""
        records = self.read_all(force_refresh=True, exclude_deleted=False)
        deleted_count = 0
        
        # Collect rows to delete (reverse order to maintain indices)
        rows_to_delete = []
        for idx, rec in enumerate(records, start=2):
            if rec.get('parent_id') == 'recycle_bin':
                if user_id is None or rec.get('user_id') == user_id:
                    rows_to_delete.append(idx)
        
        # Delete in reverse order
        for idx in sorted(rows_to_delete, reverse=True):
            try:
                self._worksheet.delete_rows(idx)
                deleted_count += 1
            except Exception as e:
                print(f"Error deleting row {idx}: {e}")
        
        self._cache.clear()
        return deleted_count


class GoogleSheetsDBManager:
    def __init__(self, spreadsheet_name: str = "Windows12OS"):
        # Eagerly connect only the most critical sheet (users) so you see logs immediately
        self.users_db = GoogleSheetsDB(spreadsheet_name, "users", connect_eagerly=True)
        # All others are lazy
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
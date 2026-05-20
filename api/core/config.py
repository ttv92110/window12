import os
from dotenv import load_dotenv
from pathlib import Path

load_dotenv()

class Settings:
    SECRET_KEY: str = os.getenv("SECRET_KEY", "dev-secret")
    ALGORITHM: str = os.getenv("ALGORITHM", "HS256")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "10080")) # 7 day
    GOOGLE_SHEETS_CREDENTIALS_FILE: str = os.getenv(
        "GOOGLE_SHEETS_CREDENTIALS_FILE", "credentials.json"
    )
    SPREADSHEET_ID: str = os.getenv("SPREADSHEET_ID", "") 
    USE_GOOGLE_SHEETS = os.getenv("USE_GOOGLE_SHEETS", "False").lower() == "true"
    # Use /tmp directory on Vercel (writable), otherwise local data directory
    if os.getenv("VERCEL"):
        DATA_DIR = Path("/tmp/data")
    else:
        BASE_DIR = Path(__file__).parent.parent
        DATA_DIR = BASE_DIR / "data"
    
    # Ensure data directory exists
    DATA_DIR.mkdir(exist_ok=True, parents=True)
    

settings = Settings()



# [------------------------------------------------------------------------------------------------]
'''

/venv
.env
.env.example
.env.local
.gitignore
.vercelignore
Dockerfile
render.yaml
README.md
requirements.txt
run.bat
run.py
runtime.txt
setup.bat
vercel.json


'''

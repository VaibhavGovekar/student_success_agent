import os
from pathlib import Path

from dotenv import load_dotenv
from supabase import create_client, Client

# Load backend/.env
load_dotenv(Path(__file__).resolve().parents[1] / ".env")

url = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

if not url or not key:
    raise RuntimeError(
        "Missing NEXT_PUBLIC_SUPABASE_URL or "
        "SUPABASE_SERVICE_ROLE_KEY in backend/.env"
    )

supabase: Client = create_client(url, key)
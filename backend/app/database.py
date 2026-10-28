
import os
from pathlib import Path
from typing import Optional

from dotenv import load_dotenv
from supabase import Client, create_client

# Explicitly load backend/.env
ENV_FILE = Path(__file__).resolve().parents[1] / ".env"
load_dotenv(ENV_FILE, override=False)

SUPABASE_URL = os.getenv("SUPABASE_URL") or os.getenv("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_KEY = (
    os.getenv("SUPABASE_KEY")
    or os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    or os.getenv("SUPABASE_SERVICE_KEY")
)

_supabase: Optional[Client] = None


def get_supabase_client() -> Client:
    """Return a singleton Supabase client."""
    global _supabase

    if _supabase is not None:
        return _supabase

    if not SUPABASE_URL or not SUPABASE_KEY:
        raise ValueError(
            f"Missing SUPABASE_URL or Supabase key. Check {ENV_FILE}"
        )

    _supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
    return _supabase


def initialize_database() -> None:
    """Check that the Supabase users table is accessible."""
    try:
        client = get_supabase_client()
        client.table("users").select("id").limit(1).execute()
        print("Connected to Supabase successfully.")
    except Exception as exc:
        print(f"Warning: Supabase connection check failed: {exc}")


def get_connection() -> Client:
    """Backwards-compatible alias."""
    return get_supabase_client()

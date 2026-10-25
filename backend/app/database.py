import os
from typing import Optional
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv()

SUPABASE_URL: Optional[str] = os.getenv("SUPABASE_URL")
SUPABASE_KEY: Optional[str] = os.getenv("SUPABASE_KEY") or os.getenv("SUPABASE_SERVICE_KEY")

_supabase: Optional[Client] = None


def get_supabase_client() -> Client:
    """Returns a singleton Supabase client instance."""
    global _supabase
    if _supabase is None:
        if not SUPABASE_URL or not SUPABASE_KEY:
            raise ValueError(
                "Missing SUPABASE_URL or SUPABASE_KEY in environment variables. "
                "Ensure they are set in your backend/.env file."
            )
        _supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
    return _supabase


def initialize_database() -> None:
    """Verifies connectivity to the Supabase PostgreSQL database."""
    try:
        client = get_supabase_client()
        # Verify active connection and table accessibility
        client.table("users").select("id").limit(1).execute()
        print("Connected to Supabase PostgreSQL database successfully.")
    except Exception as exc:
        print(f"Warning: Supabase connection check failed: {exc}")


# Backwards compatibility alias for existing code
def get_connection() -> Client:
    """Alias for get_supabase_client to avoid breaking legacy references."""
    return get_supabase_client()
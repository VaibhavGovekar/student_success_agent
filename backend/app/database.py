import os
import re
from pathlib import Path
from typing import Optional

from dotenv import load_dotenv
from supabase import Client, create_client

# Explicitly load backend/.env if present
ENV_FILE = Path(__file__).resolve().parents[1] / ".env"
load_dotenv(ENV_FILE, override=False)

_supabase: Optional[Client] = None


def clean_env_var(val: Optional[str]) -> str:
    """Sanitize URL or Key from accidental quotes, markdown links, or spaces."""
    if not val:
        return ""
    s = val.strip().strip("'\"")
    # If pasted as a markdown link like [url](url), extract the target URL
    md_match = re.search(r"\((https?://[^\s)]+)\)", s)
    if md_match:
        return md_match.group(1).strip()
    # Strip any brackets
    s = s.strip("[]")
    return s.strip()


def get_supabase_client() -> Client:
    """Return a singleton Supabase client."""
    global _supabase

    if _supabase is not None:
        return _supabase

    raw_url = os.getenv("SUPABASE_URL") or os.getenv("NEXT_PUBLIC_SUPABASE_URL")
    raw_key = (
        os.getenv("SUPABASE_KEY")
        or os.getenv("SUPABASE_SERVICE_ROLE_KEY")
        or os.getenv("SUPABASE_SERVICE_KEY")
    )

    supabase_url = clean_env_var(raw_url)
    supabase_key = clean_env_var(raw_key)

    if not supabase_url or not supabase_key:
        raise ValueError(
            f"Missing SUPABASE_URL or Supabase key. Checked env and {ENV_FILE}"
        )

    # Ensure URL protocol is strictly present
    if not supabase_url.startswith("http://") and not supabase_url.startswith("https://"):
        supabase_url = f"https://{supabase_url}"

    _supabase = create_client(supabase_url, supabase_key)
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
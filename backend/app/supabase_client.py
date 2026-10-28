"""Compatibility import; use the shared lazy client in database.py."""
from app.database import get_supabase_client

supabase = get_supabase_client()

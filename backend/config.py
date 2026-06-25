import os
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL: str = os.getenv("SUPABASE_URL", "")
SUPABASE_KEY: str = os.getenv("SUPABASE_KEY", "")
CLAUDE_API_KEY: str = os.getenv("CLAUDE_API_KEY", "")
API_KEY: str = os.getenv("API_KEY", "")

if not SUPABASE_URL:
    raise ValueError("SUPABASE_URL is not set")
if not SUPABASE_KEY:
    raise ValueError("SUPABASE_KEY is not set")
if not CLAUDE_API_KEY:
    raise ValueError("CLAUDE_API_KEY is not set")
if not API_KEY:
    raise ValueError("API_KEY is not set")

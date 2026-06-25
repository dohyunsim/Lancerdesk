import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL: str = os.getenv("DATABASE_URL", "")
CLAUDE_API_KEY: str = os.getenv("CLAUDE_API_KEY", "")
API_KEY: str = os.getenv("API_KEY", "")

if not DATABASE_URL:
    raise ValueError("DATABASE_URL is not set")
if not CLAUDE_API_KEY:
    raise ValueError("CLAUDE_API_KEY is not set")
if not API_KEY:
    raise ValueError("API_KEY is not set")

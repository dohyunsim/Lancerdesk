from __future__ import annotations
from typing import Optional
from fastapi import Header, HTTPException, Security
from fastapi.security.api_key import APIKeyHeader
from backend.config import API_KEY
from backend.auth import decode_token

_api_key_header = APIKeyHeader(name="x-api-key", auto_error=False)

async def get_current_user(
    authorization: Optional[str] = Header(None),
    api_key: Optional[str] = Security(_api_key_header),
) -> dict:
    if authorization and authorization.startswith("Bearer "):
        token = authorization.removeprefix("Bearer ").strip()
        payload = decode_token(token)
        if not payload:
            raise HTTPException(status_code=401, detail="Invalid or expired token")
        return {"user_id": str(payload["sub"]), "email": payload.get("email"), "auth_type": "jwt"}
    if api_key == API_KEY:
        return {"user_id": None, "auth_type": "api_key"}
    raise HTTPException(status_code=403, detail="Authentication required")

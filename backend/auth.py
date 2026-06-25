from __future__ import annotations

from datetime import datetime, timedelta

import bcrypt
from jose import jwt, JWTError

from backend.config import JWT_SECRET, JWT_EXPIRE_HOURS


def hash_password(plain: str) -> str:
    return bcrypt.hashpw(plain.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))


def create_access_token(user_id: str, email: str) -> str:
    expire = datetime.utcnow() + timedelta(hours=JWT_EXPIRE_HOURS)
    return jwt.encode(
        {"sub": user_id, "email": email, "exp": expire},
        JWT_SECRET,
        algorithm="HS256",
    )


def decode_token(token: str) -> dict | None:
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
    except JWTError:
        return None

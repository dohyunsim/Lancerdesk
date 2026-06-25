from __future__ import annotations

from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel, EmailStr
import psycopg2.extras

from backend.auth import hash_password, verify_password, create_access_token, decode_token
from backend.services.db import get_db

router = APIRouter(prefix="/auth", tags=["auth"])


class RegisterRequest(BaseModel):
    name: str
    email: EmailStr
    password: str


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


@router.post("/register", status_code=201)
def register(payload: RegisterRequest):
    with get_db() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute("SELECT id FROM users WHERE email = %s", (payload.email,))
            if cur.fetchone():
                raise HTTPException(status_code=409, detail="Email already registered")
            cur.execute(
                "INSERT INTO users (name, email, password_hash) VALUES (%s, %s, %s) RETURNING id, name, email",
                (payload.name, payload.email, hash_password(payload.password)),
            )
            user = dict(cur.fetchone())
    token = create_access_token(str(user["id"]), user["email"])
    return {"access_token": token, "user": user}


@router.post("/login")
def login(payload: LoginRequest):
    with get_db() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(
                "SELECT id, name, email, password_hash FROM users WHERE email = %s",
                (payload.email,),
            )
            user = cur.fetchone()
    if not user or not verify_password(payload.password, user["password_hash"] or ""):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    user = dict(user)
    token = create_access_token(str(user["id"]), user["email"])
    user.pop("password_hash")
    return {"access_token": token, "user": user}


@router.get("/me")
def me(authorization: str = Header(...)):
    token = authorization.removeprefix("Bearer ").strip()
    payload = decode_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid token")
    with get_db() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(
                "SELECT id, name, email FROM users WHERE id = %s",
                (payload["sub"],),
            )
            user = cur.fetchone()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return dict(user)

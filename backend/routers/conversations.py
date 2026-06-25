from __future__ import annotations

import json
from uuid import UUID

import psycopg2.extras
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response

from backend.dependencies import get_current_user
from backend.models.conversation import ConversationCreate, ConversationUpdate, MessageAppend
from backend.services.db import get_db

router = APIRouter(prefix="/conversations", tags=["conversations"])


@router.get("", response_model=list[dict])
def list_conversations(
    soomgo_url: str | None = None,
    user: dict = Depends(get_current_user),
) -> list[dict]:
    effective_user_id = user["user_id"] if user["auth_type"] == "jwt" else None
    with get_db() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            if soomgo_url and effective_user_id:
                cur.execute(
                    "SELECT * FROM conversations WHERE user_id = %s AND soomgo_url = %s ORDER BY created_at DESC",
                    (effective_user_id, soomgo_url),
                )
            elif effective_user_id:
                cur.execute(
                    "SELECT * FROM conversations WHERE user_id = %s ORDER BY created_at DESC",
                    (effective_user_id,),
                )
            else:
                cur.execute("SELECT * FROM conversations ORDER BY created_at DESC")
            return [dict(row) for row in cur.fetchall()]


@router.get("/{conversation_id}", response_model=dict)
def get_conversation(
    conversation_id: UUID,
    user: dict = Depends(get_current_user),
) -> dict:
    with get_db() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute("SELECT * FROM conversations WHERE id = %s", (str(conversation_id),))
            row = cur.fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="Conversation not found")
            return dict(row)


@router.post("", response_model=dict, status_code=201)
def create_conversation(
    payload: ConversationCreate,
    user: dict = Depends(get_current_user),
) -> dict:
    if user["auth_type"] == "jwt":
        payload.user_id = user["user_id"]
    with get_db() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(
                """
                INSERT INTO conversations
                  (user_id, project_id, soomgo_url, category, client_name, client_id, messages)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
                RETURNING *
                """,
                (
                    str(payload.user_id),
                    str(payload.project_id) if payload.project_id else None,
                    payload.soomgo_url,
                    payload.category,
                    payload.client_name,
                    payload.client_id,
                    json.dumps(payload.messages),
                ),
            )
            return dict(cur.fetchone())


@router.patch("/{conversation_id}", response_model=dict)
def update_conversation(
    conversation_id: UUID,
    payload: ConversationUpdate,
    user: dict = Depends(get_current_user),
) -> dict:
    fields = []
    values = []
    if payload.project_id is not None:
        fields.append("project_id = %s")
        values.append(str(payload.project_id))
    if payload.soomgo_url is not None:
        fields.append("soomgo_url = %s")
        values.append(payload.soomgo_url)
    if payload.category is not None:
        fields.append("category = %s")
        values.append(payload.category)

    if not fields:
        raise HTTPException(status_code=400, detail="No fields to update")

    values.append(str(conversation_id))
    with get_db() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(
                f"UPDATE conversations SET {', '.join(fields)} WHERE id = %s RETURNING *",
                values,
            )
            row = cur.fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="Conversation not found")
            return dict(row)


@router.post("/{conversation_id}/messages", response_model=dict)
def append_message(
    conversation_id: UUID,
    payload: MessageAppend,
    user: dict = Depends(get_current_user),
) -> dict:
    with get_db() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(
                """
                UPDATE conversations
                SET messages = messages || %s::jsonb
                WHERE id = %s
                RETURNING *
                """,
                (
                    json.dumps([{"role": payload.role, "content": payload.content, "timestamp": payload.timestamp}]),
                    str(conversation_id),
                ),
            )
            row = cur.fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="Conversation not found")
            return dict(row)


@router.delete("/{conversation_id}")
def delete_conversation(
    conversation_id: UUID,
    user: dict = Depends(get_current_user),
) -> Response:
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute("DELETE FROM conversations WHERE id = %s", (str(conversation_id),))
    return Response(status_code=204)

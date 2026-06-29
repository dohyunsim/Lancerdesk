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
            if user["auth_type"] == "jwt" and row["user_id"] != user["user_id"]:
                raise HTTPException(status_code=403, detail="Forbidden")
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
    fields = ["updated_at = NOW()"]
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
    if payload.client_name is not None:
        fields.append("client_name = %s")
        values.append(payload.client_name)
    if payload.client_id is not None:
        fields.append("client_id = %s")
        values.append(payload.client_id)

    values.append(str(conversation_id))
    if user["auth_type"] == "jwt":
        values.append(user["user_id"])
        user_clause = " AND user_id = %s"
    else:
        user_clause = ""
    with get_db() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(
                f"UPDATE conversations SET {', '.join(fields)} WHERE id = %s{user_clause} RETURNING *",
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


@router.post("/{conversation_id}/create-project")
def create_project_from_conversation(
    conversation_id: str,
    user: dict = Depends(get_current_user),
):
    """conversation 기반 프로젝트 자동 생성 (이미 있으면 기존 반환)"""
    with get_db() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            # conversation 조회
            cur.execute("SELECT * FROM conversations WHERE id = %s", (conversation_id,))
            conv = cur.fetchone()
            if not conv:
                raise HTTPException(status_code=404, detail="Conversation not found")
            if user["auth_type"] == "jwt" and conv["user_id"] != user["user_id"]:
                raise HTTPException(status_code=403, detail="Forbidden")

            # 이미 project_id가 연결되어 있으면 기존 프로젝트 반환
            if conv.get("project_id"):
                cur.execute("SELECT * FROM projects WHERE id = %s", (str(conv["project_id"]),))
                existing = cur.fetchone()
                if existing:
                    return {"project": dict(existing), "created": False}

            # 새 프로젝트 생성
            title = f"{conv['client_name'] or '고객'} - {conv['category'] or '미분류'} 상담"
            cur.execute(
                """
                INSERT INTO projects (user_id, title, category, status, client_name)
                VALUES (%s, %s, %s, 'active', %s)
                RETURNING *
                """,
                (
                    conv["user_id"],
                    title,
                    conv["category"] or "",
                    conv["client_name"] or "",
                ),
            )
            project = dict(cur.fetchone())

            # conversation에 project_id 연결
            cur.execute(
                "UPDATE conversations SET project_id = %s WHERE id = %s",
                (str(project["id"]), conversation_id),
            )
            conn.commit()

            return {"project": project, "created": True}


@router.delete("/{conversation_id}")
def delete_conversation(
    conversation_id: UUID,
    user: dict = Depends(get_current_user),
) -> Response:
    if user["auth_type"] == "jwt":
        with get_db() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "DELETE FROM conversations WHERE id = %s AND user_id = %s",
                    (str(conversation_id), user["user_id"]),
                )
    else:
        with get_db() as conn:
            with conn.cursor() as cur:
                cur.execute("DELETE FROM conversations WHERE id = %s", (str(conversation_id),))
    return Response(status_code=204)

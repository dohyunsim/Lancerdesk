from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Security
from fastapi.security.api_key import APIKeyHeader

from backend.config import API_KEY
from backend.models.conversation import (
    ConversationCreate,
    ConversationResponse,
    ConversationUpdate,
    MessageAppend,
)
from backend.services.supabase import get_supabase

router = APIRouter(prefix="/conversations", tags=["conversations"])

api_key_header = APIKeyHeader(name="x-api-key", auto_error=True)


def verify_api_key(key: str = Security(api_key_header)) -> str:
    if key != API_KEY:
        raise HTTPException(status_code=403, detail="Invalid API key")
    return key


@router.get("", response_model=list[dict])
async def list_conversations(
    user_id: str | None = None,
    _: str = Depends(verify_api_key),
) -> list[dict]:
    db = get_supabase()
    query = db.table("conversations").select("*")
    if user_id:
        query = query.eq("user_id", user_id)
    result = query.order("created_at", desc=True).execute()
    return result.data


@router.get("/{conversation_id}", response_model=dict)
async def get_conversation(
    conversation_id: UUID,
    _: str = Depends(verify_api_key),
) -> dict:
    db = get_supabase()
    result = (
        db.table("conversations")
        .select("*")
        .eq("id", str(conversation_id))
        .single()
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return result.data


@router.post("", response_model=dict, status_code=201)
async def create_conversation(
    payload: ConversationCreate,
    _: str = Depends(verify_api_key),
) -> dict:
    db = get_supabase()
    data = {
        "user_id": str(payload.user_id),
        "project_id": str(payload.project_id) if payload.project_id else None,
        "soomgo_url": payload.soomgo_url,
        "category": payload.category,
        "messages": payload.messages,
    }
    result = db.table("conversations").insert(data).execute()
    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to create conversation")
    return result.data[0]


@router.patch("/{conversation_id}", response_model=dict)
async def update_conversation(
    conversation_id: UUID,
    payload: ConversationUpdate,
    _: str = Depends(verify_api_key),
) -> dict:
    db = get_supabase()
    update_data: dict = {}
    if payload.project_id is not None:
        update_data["project_id"] = str(payload.project_id)
    if payload.soomgo_url is not None:
        update_data["soomgo_url"] = payload.soomgo_url
    if payload.category is not None:
        update_data["category"] = payload.category

    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")

    result = (
        db.table("conversations")
        .update(update_data)
        .eq("id", str(conversation_id))
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return result.data[0]


@router.post("/{conversation_id}/messages", response_model=dict)
async def append_message(
    conversation_id: UUID,
    payload: MessageAppend,
    _: str = Depends(verify_api_key),
) -> dict:
    """Append a single message to the conversation's messages JSONB array."""
    db = get_supabase()

    # Fetch existing conversation
    existing = (
        db.table("conversations")
        .select("messages")
        .eq("id", str(conversation_id))
        .single()
        .execute()
    )
    if not existing.data:
        raise HTTPException(status_code=404, detail="Conversation not found")

    current_messages: list = existing.data.get("messages") or []
    new_message = {
        "role": payload.role,
        "content": payload.content,
        "timestamp": payload.timestamp,
    }
    current_messages.append(new_message)

    result = (
        db.table("conversations")
        .update({"messages": current_messages})
        .eq("id", str(conversation_id))
        .execute()
    )
    return result.data[0]


@router.delete("/{conversation_id}", status_code=204)
async def delete_conversation(
    conversation_id: UUID,
    _: str = Depends(verify_api_key),
) -> None:
    db = get_supabase()
    db.table("conversations").delete().eq("id", str(conversation_id)).execute()

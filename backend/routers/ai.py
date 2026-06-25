from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Security
from fastapi.security.api_key import APIKeyHeader

from backend.config import API_KEY
from backend.models.ai import AISuggestRequest, AISuggestResponse
from backend.services.claude import generate_reply_suggestion
from backend.services.supabase import get_supabase

router = APIRouter(prefix="/ai", tags=["ai"])

api_key_header = APIKeyHeader(name="x-api-key", auto_error=True)


def verify_api_key(key: str = Security(api_key_header)) -> str:
    if key != API_KEY:
        raise HTTPException(status_code=403, detail="Invalid API key")
    return key


@router.post("/suggest", response_model=AISuggestResponse)
async def suggest_reply(
    payload: AISuggestRequest,
    _: str = Depends(verify_api_key),
) -> AISuggestResponse:
    """Generate an AI-powered reply suggestion for a soomgo conversation."""
    try:
        suggestion = generate_reply_suggestion(
            conversation_messages=payload.messages,
            category=payload.category,
            context=payload.context,
        )
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"AI generation failed: {str(exc)}",
        ) from exc

    # Persist the AI response to the database
    db = get_supabase()
    prompt_summary = f"category={payload.category}, messages_count={len(payload.messages)}"
    db.table("ai_responses").insert(
        {
            "conversation_id": str(payload.conversation_id),
            "prompt": prompt_summary,
            "response": suggestion,
            "model": "claude-haiku-4-5",
        }
    ).execute()

    return AISuggestResponse(
        suggestion=suggestion,
        conversation_id=payload.conversation_id,
        model="claude-haiku-4-5",
    )

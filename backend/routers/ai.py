from __future__ import annotations

import psycopg2.extras
from fastapi import APIRouter, Depends, HTTPException

from backend.dependencies import get_current_user
from backend.models.ai import AISuggestRequest, AISuggestResponse
from backend.services.claude import generate_reply_suggestion
from backend.services.db import get_db

router = APIRouter(prefix="/ai", tags=["ai"])


@router.post("/suggest", response_model=AISuggestResponse)
def suggest_reply(
    payload: AISuggestRequest,
    user: dict = Depends(get_current_user),
) -> AISuggestResponse:
    try:
        suggestion = generate_reply_suggestion(
            conversation_messages=payload.messages,
            category=payload.category,
            context=payload.context,
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"AI generation failed: {str(exc)}") from exc

    try:
        with get_db() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "INSERT INTO ai_responses (conversation_id, prompt, response, model) VALUES (%s, %s, %s, %s)",
                    (
                        str(payload.conversation_id),
                        f"category={payload.category}, messages_count={len(payload.messages)}",
                        suggestion,
                        "claude-haiku-4-5",
                    ),
                )
    except Exception:
        pass  # DB 저장 실패해도 AI 응답은 반환

    return AISuggestResponse(
        suggestion=suggestion,
        conversation_id=payload.conversation_id,
        model="claude-haiku-4-5",
    )

from __future__ import annotations

from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel


class AISuggestRequest(BaseModel):
    conversation_id: UUID
    messages: list[dict[str, Any]]
    category: str = "general"
    context: str = ""


class AISuggestResponse(BaseModel):
    suggestion: str
    conversation_id: UUID
    model: str = "claude-haiku-4-5"


class AIResponseRecord(BaseModel):
    id: UUID
    conversation_id: UUID
    prompt: str
    response: str
    model: str
    created_at: datetime

    class Config:
        from_attributes = True

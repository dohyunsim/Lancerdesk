from __future__ import annotations

from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, Field


class MessageItem(BaseModel):
    role: str  # 'client' | 'freelancer'
    content: str
    timestamp: str = ""


class ConversationCreate(BaseModel):
    user_id: UUID | None = None  # JWT 인증 시 백엔드가 토큰에서 자동 추출
    project_id: UUID | None = None
    soomgo_url: str = ""
    category: str = "general"
    client_name: str = ""
    client_id: str = ""
    messages: list[dict[str, Any]] = Field(default_factory=list)


class ConversationUpdate(BaseModel):
    project_id: UUID | None = None
    soomgo_url: str | None = None
    category: str | None = None
    client_name: str | None = None
    client_id: str | None = None


class MessageAppend(BaseModel):
    role: str
    content: str
    timestamp: str = ""


class ConversationResponse(BaseModel):
    id: UUID
    user_id: UUID
    project_id: UUID | None
    soomgo_url: str
    category: str
    client_name: str = ""
    client_id: str = ""
    messages: list[dict[str, Any]]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

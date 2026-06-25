from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel


class ProjectCreate(BaseModel):
    user_id: UUID
    title: str
    category: str
    status: str = "active"
    budget: Decimal | None = None
    client_name: str = ""


class ProjectUpdate(BaseModel):
    title: str | None = None
    category: str | None = None
    status: str | None = None
    budget: Decimal | None = None
    client_name: str | None = None


class ProjectResponse(BaseModel):
    id: UUID
    user_id: UUID
    title: str
    category: str
    status: str
    budget: Decimal | None
    client_name: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

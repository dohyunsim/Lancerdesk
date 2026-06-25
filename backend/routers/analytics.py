from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Security
from fastapi.security.api_key import APIKeyHeader

from backend.config import API_KEY
from backend.services.supabase import get_supabase

router = APIRouter(prefix="/analytics", tags=["analytics"])

api_key_header = APIKeyHeader(name="x-api-key", auto_error=True)


def verify_api_key(key: str = Security(api_key_header)) -> str:
    if key != API_KEY:
        raise HTTPException(status_code=403, detail="Invalid API key")
    return key


@router.get("/summary")
async def get_summary(
    user_id: str | None = None,
    _: str = Depends(verify_api_key),
) -> dict:
    """Return high-level counts: total projects, active projects, total conversations, AI responses."""
    db = get_supabase()

    projects_query = db.table("projects").select("id, status")
    conversations_query = db.table("conversations").select("id, category")
    ai_query = db.table("ai_responses").select("id")

    if user_id:
        projects_query = projects_query.eq("user_id", user_id)
        conversations_query = conversations_query.eq("user_id", user_id)

    projects_result = projects_query.execute()
    conversations_result = conversations_query.execute()
    ai_result = ai_query.execute()

    projects = projects_result.data or []
    conversations = conversations_result.data or []
    ai_responses = ai_result.data or []

    active_projects = [p for p in projects if p.get("status") == "active"]

    # Category breakdown
    category_counts: dict[str, int] = {}
    for conv in conversations:
        cat = conv.get("category", "general")
        category_counts[cat] = category_counts.get(cat, 0) + 1

    return {
        "total_projects": len(projects),
        "active_projects": len(active_projects),
        "total_conversations": len(conversations),
        "total_ai_responses": len(ai_responses),
        "category_breakdown": category_counts,
    }


@router.get("/monthly")
async def get_monthly(
    user_id: str | None = None,
    year: int = 2025,
    _: str = Depends(verify_api_key),
) -> list[dict]:
    """Return monthly conversation and project counts for a given year."""
    db = get_supabase()

    start_date = f"{year}-01-01T00:00:00"
    end_date = f"{year}-12-31T23:59:59"

    conversations_query = (
        db.table("conversations")
        .select("id, created_at")
        .gte("created_at", start_date)
        .lte("created_at", end_date)
    )
    projects_query = (
        db.table("projects")
        .select("id, created_at")
        .gte("created_at", start_date)
        .lte("created_at", end_date)
    )

    if user_id:
        conversations_query = conversations_query.eq("user_id", user_id)
        projects_query = projects_query.eq("user_id", user_id)

    conversations_result = conversations_query.execute()
    projects_result = projects_query.execute()

    # Initialize monthly buckets
    monthly: dict[int, dict] = {
        m: {"month": m, "conversations": 0, "projects": 0} for m in range(1, 13)
    }

    for conv in conversations_result.data or []:
        created = conv.get("created_at", "")
        if created:
            month = int(created[5:7])
            monthly[month]["conversations"] += 1

    for proj in projects_result.data or []:
        created = proj.get("created_at", "")
        if created:
            month = int(created[5:7])
            monthly[month]["projects"] += 1

    return list(monthly.values())

from __future__ import annotations

import psycopg2.extras
from fastapi import APIRouter, Depends, HTTPException, Security
from fastapi.security.api_key import APIKeyHeader

from backend.config import API_KEY
from backend.services.db import get_db

router = APIRouter(prefix="/analytics", tags=["analytics"])
api_key_header = APIKeyHeader(name="x-api-key", auto_error=True)


def verify_api_key(key: str = Security(api_key_header)) -> str:
    if key != API_KEY:
        raise HTTPException(status_code=403, detail="Invalid API key")
    return key


@router.get("/summary")
def get_summary(
    user_id: str | None = None,
    _: str = Depends(verify_api_key),
) -> dict:
    with get_db() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            if user_id:
                cur.execute("SELECT id, status FROM projects WHERE user_id = %s", (user_id,))
            else:
                cur.execute("SELECT id, status FROM projects")
            projects = cur.fetchall()

            if user_id:
                cur.execute("SELECT id, category FROM conversations WHERE user_id = %s", (user_id,))
            else:
                cur.execute("SELECT id, category FROM conversations")
            conversations = cur.fetchall()

            cur.execute("SELECT COUNT(*) AS cnt FROM ai_responses")
            ai_count = cur.fetchone()["cnt"]

    active_projects = sum(1 for p in projects if p["status"] == "active")
    category_counts: dict[str, int] = {}
    for conv in conversations:
        cat = conv["category"] or "general"
        category_counts[cat] = category_counts.get(cat, 0) + 1

    return {
        "total_projects": len(projects),
        "active_projects": active_projects,
        "total_conversations": len(conversations),
        "total_ai_responses": ai_count,
        "category_breakdown": category_counts,
    }


@router.get("/monthly")
def get_monthly(
    user_id: str | None = None,
    year: int = 2025,
    _: str = Depends(verify_api_key),
) -> list[dict]:
    with get_db() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            if user_id:
                cur.execute(
                    "SELECT EXTRACT(MONTH FROM created_at)::int AS month, COUNT(*) AS cnt "
                    "FROM conversations WHERE user_id = %s AND EXTRACT(YEAR FROM created_at) = %s "
                    "GROUP BY month",
                    (user_id, year),
                )
            else:
                cur.execute(
                    "SELECT EXTRACT(MONTH FROM created_at)::int AS month, COUNT(*) AS cnt "
                    "FROM conversations WHERE EXTRACT(YEAR FROM created_at) = %s GROUP BY month",
                    (year,),
                )
            conv_rows = {row["month"]: row["cnt"] for row in cur.fetchall()}

            if user_id:
                cur.execute(
                    "SELECT EXTRACT(MONTH FROM created_at)::int AS month, COUNT(*) AS cnt "
                    "FROM projects WHERE user_id = %s AND EXTRACT(YEAR FROM created_at) = %s "
                    "GROUP BY month",
                    (user_id, year),
                )
            else:
                cur.execute(
                    "SELECT EXTRACT(MONTH FROM created_at)::int AS month, COUNT(*) AS cnt "
                    "FROM projects WHERE EXTRACT(YEAR FROM created_at) = %s GROUP BY month",
                    (year,),
                )
            proj_rows = {row["month"]: row["cnt"] for row in cur.fetchall()}

    return [
        {
            "month": m,
            "conversations": conv_rows.get(m, 0),
            "projects": proj_rows.get(m, 0),
        }
        for m in range(1, 13)
    ]

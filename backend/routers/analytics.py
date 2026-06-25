from __future__ import annotations

from datetime import datetime

import psycopg2.extras
from fastapi import APIRouter, Depends, HTTPException

from backend.dependencies import get_current_user
from backend.services.db import get_db

router = APIRouter(prefix="/analytics", tags=["analytics"])


@router.get("/summary")
def get_summary(
    user_id: str | None = None,
    user: dict = Depends(get_current_user),
) -> dict:
    effective_user_id = user["user_id"] if user["auth_type"] == "jwt" else user_id
    with get_db() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            if effective_user_id:
                cur.execute("SELECT id, status FROM projects WHERE user_id = %s", (effective_user_id,))
            else:
                cur.execute("SELECT id, status FROM projects")
            projects = cur.fetchall()

            if effective_user_id:
                cur.execute("SELECT id, category FROM conversations WHERE user_id = %s", (effective_user_id,))
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
    year: int | None = None,
    user: dict = Depends(get_current_user),
) -> list[dict]:
    effective_user_id = user["user_id"] if user["auth_type"] == "jwt" else user_id
    if year is None:
        year = datetime.now().year
    with get_db() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            if effective_user_id:
                cur.execute(
                    "SELECT EXTRACT(MONTH FROM created_at)::int AS month, COUNT(*) AS cnt "
                    "FROM conversations WHERE user_id = %s AND EXTRACT(YEAR FROM created_at) = %s "
                    "GROUP BY month",
                    (effective_user_id, year),
                )
            else:
                cur.execute(
                    "SELECT EXTRACT(MONTH FROM created_at)::int AS month, COUNT(*) AS cnt "
                    "FROM conversations WHERE EXTRACT(YEAR FROM created_at) = %s GROUP BY month",
                    (year,),
                )
            conv_rows = {row["month"]: row["cnt"] for row in cur.fetchall()}

            if effective_user_id:
                cur.execute(
                    "SELECT EXTRACT(MONTH FROM created_at)::int AS month, COUNT(*) AS cnt "
                    "FROM projects WHERE user_id = %s AND EXTRACT(YEAR FROM created_at) = %s "
                    "GROUP BY month",
                    (effective_user_id, year),
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

from __future__ import annotations

from uuid import UUID

import psycopg2.extras
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response

from backend.dependencies import get_current_user
from backend.models.project import ProjectCreate, ProjectUpdate
from backend.services.db import get_db

router = APIRouter(prefix="/projects", tags=["projects"])


@router.get("", response_model=list[dict])
def list_projects(
    user_id: str | None = None,
    status: str | None = None,
    user: dict = Depends(get_current_user),
) -> list[dict]:
    effective_user_id = user["user_id"] if user["auth_type"] == "jwt" else user_id
    with get_db() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            conditions = []
            values = []
            if effective_user_id:
                conditions.append("user_id = %s")
                values.append(effective_user_id)
            if status:
                conditions.append("status = %s")
                values.append(status)

            where = f"WHERE {' AND '.join(conditions)}" if conditions else ""
            cur.execute(f"SELECT * FROM projects {where} ORDER BY created_at DESC", values)
            return [dict(row) for row in cur.fetchall()]


@router.get("/{project_id}", response_model=dict)
def get_project(
    project_id: UUID,
    user: dict = Depends(get_current_user),
) -> dict:
    with get_db() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute("SELECT * FROM projects WHERE id = %s", (str(project_id),))
            row = cur.fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="Project not found")
            return dict(row)


@router.post("", response_model=dict, status_code=201)
def create_project(
    payload: ProjectCreate,
    user: dict = Depends(get_current_user),
) -> dict:
    if user["auth_type"] == "jwt":
        payload.user_id = user["user_id"]
    with get_db() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(
                """
                INSERT INTO projects (user_id, title, category, status, budget, client_name)
                VALUES (%s, %s, %s, %s, %s, %s)
                RETURNING *
                """,
                (
                    str(payload.user_id),
                    payload.title,
                    payload.category,
                    payload.status,
                    float(payload.budget) if payload.budget is not None else None,
                    payload.client_name,
                ),
            )
            return dict(cur.fetchone())


@router.patch("/{project_id}", response_model=dict)
def update_project(
    project_id: UUID,
    payload: ProjectUpdate,
    user: dict = Depends(get_current_user),
) -> dict:
    fields = []
    values = []
    if payload.title is not None:
        fields.append("title = %s")
        values.append(payload.title)
    if payload.category is not None:
        fields.append("category = %s")
        values.append(payload.category)
    if payload.status is not None:
        fields.append("status = %s")
        values.append(payload.status)
    if payload.budget is not None:
        fields.append("budget = %s")
        values.append(float(payload.budget))
    if payload.client_name is not None:
        fields.append("client_name = %s")
        values.append(payload.client_name)

    if not fields:
        raise HTTPException(status_code=400, detail="No fields to update")

    values.append(str(project_id))
    with get_db() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(
                f"UPDATE projects SET {', '.join(fields)} WHERE id = %s RETURNING *",
                values,
            )
            row = cur.fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="Project not found")
            return dict(row)


@router.delete("/{project_id}")
def delete_project(
    project_id: UUID,
    user: dict = Depends(get_current_user),
) -> Response:
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute("DELETE FROM projects WHERE id = %s", (str(project_id),))
    return Response(status_code=204)

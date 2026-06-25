from __future__ import annotations

from uuid import UUID

import psycopg2.extras
from fastapi import APIRouter, Depends, HTTPException, Security
from fastapi.responses import Response
from fastapi.security.api_key import APIKeyHeader

from backend.config import API_KEY
from backend.models.project import ProjectCreate, ProjectUpdate
from backend.services.db import get_db

router = APIRouter(prefix="/projects", tags=["projects"])
api_key_header = APIKeyHeader(name="x-api-key", auto_error=True)


def verify_api_key(key: str = Security(api_key_header)) -> str:
    if key != API_KEY:
        raise HTTPException(status_code=403, detail="Invalid API key")
    return key


@router.get("", response_model=list[dict])
def list_projects(
    user_id: str | None = None,
    status: str | None = None,
    _: str = Depends(verify_api_key),
) -> list[dict]:
    with get_db() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            conditions = []
            values = []
            if user_id:
                conditions.append("user_id = %s")
                values.append(user_id)
            if status:
                conditions.append("status = %s")
                values.append(status)

            where = f"WHERE {' AND '.join(conditions)}" if conditions else ""
            cur.execute(f"SELECT * FROM projects {where} ORDER BY created_at DESC", values)
            return [dict(row) for row in cur.fetchall()]


@router.get("/{project_id}", response_model=dict)
def get_project(
    project_id: UUID,
    _: str = Depends(verify_api_key),
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
    _: str = Depends(verify_api_key),
) -> dict:
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
    _: str = Depends(verify_api_key),
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
    _: str = Depends(verify_api_key),
) -> Response:
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute("DELETE FROM projects WHERE id = %s", (str(project_id),))
    return Response(status_code=204)

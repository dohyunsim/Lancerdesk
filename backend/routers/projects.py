from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Security
from fastapi.security.api_key import APIKeyHeader

from backend.config import API_KEY
from backend.models.project import ProjectCreate, ProjectUpdate
from backend.services.supabase import get_supabase

router = APIRouter(prefix="/projects", tags=["projects"])

api_key_header = APIKeyHeader(name="x-api-key", auto_error=True)


def verify_api_key(key: str = Security(api_key_header)) -> str:
    if key != API_KEY:
        raise HTTPException(status_code=403, detail="Invalid API key")
    return key


@router.get("", response_model=list[dict])
async def list_projects(
    user_id: str | None = None,
    status: str | None = None,
    _: str = Depends(verify_api_key),
) -> list[dict]:
    db = get_supabase()
    query = db.table("projects").select("*")
    if user_id:
        query = query.eq("user_id", user_id)
    if status:
        query = query.eq("status", status)
    result = query.order("created_at", desc=True).execute()
    return result.data


@router.get("/{project_id}", response_model=dict)
async def get_project(
    project_id: UUID,
    _: str = Depends(verify_api_key),
) -> dict:
    db = get_supabase()
    result = (
        db.table("projects")
        .select("*")
        .eq("id", str(project_id))
        .single()
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Project not found")
    return result.data


@router.post("", response_model=dict, status_code=201)
async def create_project(
    payload: ProjectCreate,
    _: str = Depends(verify_api_key),
) -> dict:
    db = get_supabase()
    data = {
        "user_id": str(payload.user_id),
        "title": payload.title,
        "category": payload.category,
        "status": payload.status,
        "budget": float(payload.budget) if payload.budget is not None else None,
        "client_name": payload.client_name,
    }
    result = db.table("projects").insert(data).execute()
    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to create project")
    return result.data[0]


@router.patch("/{project_id}", response_model=dict)
async def update_project(
    project_id: UUID,
    payload: ProjectUpdate,
    _: str = Depends(verify_api_key),
) -> dict:
    db = get_supabase()
    update_data: dict = {}
    if payload.title is not None:
        update_data["title"] = payload.title
    if payload.category is not None:
        update_data["category"] = payload.category
    if payload.status is not None:
        update_data["status"] = payload.status
    if payload.budget is not None:
        update_data["budget"] = float(payload.budget)
    if payload.client_name is not None:
        update_data["client_name"] = payload.client_name

    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")

    result = (
        db.table("projects")
        .update(update_data)
        .eq("id", str(project_id))
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Project not found")
    return result.data[0]


@router.delete("/{project_id}", status_code=204)
async def delete_project(
    project_id: UUID,
    _: str = Depends(verify_api_key),
) -> None:
    db = get_supabase()
    db.table("projects").delete().eq("id", str(project_id)).execute()

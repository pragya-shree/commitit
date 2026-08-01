"""
Analysis Progress API Router for Phase 15 Repository Import & Analysis Experience.
Provides real-time task progress monitoring, live logs, cancellation, and retry endpoints.
"""

from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.models.auth import User
from app.services.auth_service import get_current_user
from app.services.analysis_service import (
    cancel_task,
    get_task,
    list_user_tasks,
    start_analysis_job,
)

router = APIRouter(prefix="", tags=["Analysis Progress"])


class ImportRequest(BaseModel):
    github_url: str = Field(..., description="Public GitHub repository URL to clone and analyze")


class TaskStatusResponse(BaseModel):
    task_id: str
    user_id: str
    repository_id: Optional[str] = None
    github_url: str
    status: str
    current_stage: str
    progress_percent: int
    logs: List[Dict[str, str]]
    metadata: Optional[Dict[str, Any]] = None
    error_message: Optional[str] = None
    started_at: str
    completed_at: Optional[str] = None
    cancel_requested: bool = False


@router.post(
    "/analysis/import",
    response_model=TaskStatusResponse,
    summary="Start or queue a new repository clone & analysis task",
)
def start_import(
    request: ImportRequest,
    current_user: User = Depends(get_current_user),
) -> TaskStatusResponse:
    """Validate, clone, and queue an asynchronous analysis job for a GitHub repository URL."""
    task = start_analysis_job(request.github_url.strip(), current_user.id)
    return TaskStatusResponse(**task.to_dict())


@router.get(
    "/analysis/{task_id}/status",
    response_model=TaskStatusResponse,
    summary="Get real-time analysis status, stage progress, and live logs",
)
def get_analysis_status(
    task_id: str,
    current_user: User = Depends(get_current_user),
) -> TaskStatusResponse:
    """Retrieve current progress percentage, stage, live log stream, and metadata for a task."""
    task = get_task(task_id)
    if not task or task.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Analysis task not found")
    return TaskStatusResponse(**task.to_dict())


@router.post(
    "/analysis/{task_id}/cancel",
    summary="Cancel an in-progress repository analysis task",
)
def cancel_analysis(
    task_id: str,
    current_user: User = Depends(get_current_user),
) -> dict:
    """Cancel an active analysis job and clean up temporary storage."""
    success = cancel_task(task_id, current_user.id)
    if not success:
        raise HTTPException(status_code=400, detail="Cannot cancel task (not found or already completed/cancelled)")
    return {"task_id": task_id, "status": "cancelled", "detail": "Analysis task cancelled successfully"}


@router.post(
    "/analysis/{task_id}/retry",
    response_model=TaskStatusResponse,
    summary="Retry a failed or cancelled repository analysis task",
)
def retry_analysis(
    task_id: str,
    current_user: User = Depends(get_current_user),
) -> TaskStatusResponse:
    """Re-queue an analysis task that previously failed or was cancelled."""
    old_task = get_task(task_id)
    if not old_task or old_task.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Analysis task not found")

    new_task = start_analysis_job(old_task.github_url, current_user.id)
    return TaskStatusResponse(**new_task.to_dict())


@router.get(
    "/analysis/active",
    response_model=List[TaskStatusResponse],
    summary="List active or recent analysis tasks for the authenticated user",
)
def list_active_analyses(
    current_user: User = Depends(get_current_user),
) -> List[TaskStatusResponse]:
    """Return all active and recent analysis tasks for the user."""
    tasks = list_user_tasks(current_user.id)
    return [TaskStatusResponse(**t) for t in tasks]

"""
Dashboard API Router for Phase 14 Repository Dashboard, Workspace & First-Time Experience.
Aggregates workspace overview metrics, recent repositories, AI conversations, continue working targets,
repository favoriting, repository deletion, and conversation management.
"""

from datetime import datetime, timezone
import json
import shutil
from pathlib import Path
from typing import Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.database import get_db
from app.models.ai_chat import AIChatMessage, AIChatSession
from app.models.auth import AnalysisHistory, User, UserActivity, UserRepository
from app.models.auth_schemas import UserResponse
from app.services.auth_service import get_current_user, require_repository_owner
from app.services.repository_store import compute_folder_stats
from app.services.user_service import get_user_activities, get_user_stats, log_user_activity

router = APIRouter(prefix="", tags=["Dashboard"])


class DashboardRepoItem(BaseModel):
    repository_id: str
    name: str
    github_url: str
    github_owner: str
    github_repo: str
    default_branch: str
    created_at: str
    last_opened_at: Optional[str] = None
    is_favorite: bool = False
    primary_language: str = "Python"
    files: int = 0
    directories: int = 0
    size: str = "0.0 KB"
    has_knowledge_graph: bool = False
    last_analyzed_at: Optional[str] = None


class DashboardConversationItem(BaseModel):
    id: str
    repository_id: str
    repository_name: Optional[str] = None
    title: str
    provider_name: str
    model_name: str
    is_pinned: bool = False
    last_message_preview: Optional[str] = None
    created_at: str
    updated_at: str


class ContinueWorkingTarget(BaseModel):
    last_repository: Optional[DashboardRepoItem] = None
    last_conversation: Optional[DashboardConversationItem] = None
    last_analysis_at: Optional[str] = None


class DashboardOverviewResponse(BaseModel):
    greeting: str
    user: UserResponse
    continue_working: ContinueWorkingTarget
    stats: dict
    recent_repositories: List[DashboardRepoItem]
    recent_conversations: List[DashboardConversationItem]
    activity_timeline: List[dict]


class RenameConversationRequest(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)


def get_time_greeting() -> str:
    """Return greeting string based on current hour."""
    hour = datetime.now(timezone.utc).hour
    if 5 <= hour < 12:
        return "Good morning"
    elif 12 <= hour < 17:
        return "Good afternoon"
    elif 17 <= hour < 22:
        return "Good evening"
    else:
        return "Good night"


@router.get(
    "/dashboard/overview",
    response_model=DashboardOverviewResponse,
    summary="Get aggregated workspace dashboard overview"
)
def get_dashboard_overview(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> DashboardOverviewResponse:
    """Retrieve full dashboard metrics, repositories, conversations, and activity."""
    greeting = f"{get_time_greeting()}, {current_user.display_name}"

    # Fetch User Repositories
    repos = (
        db.query(UserRepository)
        .filter(UserRepository.user_id == current_user.id)
        .order_by(UserRepository.is_favorite.desc(), UserRepository.created_at.desc())
        .all()
    )

    repo_items: List[DashboardRepoItem] = []
    for r in repos:
        try:
            path = Path(settings.REPO_STORAGE_DIR) / r.user_id / r.id
            disk_stats = compute_folder_stats(path)
        except Exception:
            disk_stats = {"files": 0, "directories": 0, "size": "0.0 KB"}

        latest_analysis = (
            db.query(AnalysisHistory)
            .filter(AnalysisHistory.repository_id == r.id)
            .order_by(AnalysisHistory.created_at.desc())
            .first()
        )

        repo_items.append(
            DashboardRepoItem(
                repository_id=r.id,
                name=r.name,
                github_url=r.github_url,
                github_owner=r.github_owner,
                github_repo=r.github_repo,
                default_branch=r.default_branch,
                created_at=r.created_at.isoformat() if r.created_at else "",
                last_opened_at=r.last_opened_at.isoformat() if r.last_opened_at else None,
                is_favorite=getattr(r, "is_favorite", False) or False,
                primary_language=getattr(r, "primary_language", "Python") or "Python",
                files=disk_stats.get("files", 0),
                directories=disk_stats.get("directories", 0),
                size=disk_stats.get("size", "0.0 KB"),
                has_knowledge_graph=latest_analysis is not None,
                last_analyzed_at=latest_analysis.created_at.isoformat() if latest_analysis else None,
            )
        )

    # Fetch AI Conversations
    conversations = (
        db.query(AIChatSession)
        .filter(AIChatSession.user_id == current_user.id)
        .order_by(AIChatSession.is_pinned.desc(), AIChatSession.updated_at.desc())
        .all()
    )

    conv_items: List[DashboardConversationItem] = []
    for c in conversations:
        repo_obj = db.query(UserRepository).filter(UserRepository.id == c.repository_id).first()
        conv_items.append(
            DashboardConversationItem(
                id=c.id,
                repository_id=c.repository_id,
                repository_name=repo_obj.name if repo_obj else "Repository",
                title=c.title,
                provider_name=c.provider_name,
                model_name=c.model_name,
                is_pinned=getattr(c, "is_pinned", False) or False,
                last_message_preview=getattr(c, "last_message_preview", None),
                created_at=c.created_at.isoformat(),
                updated_at=c.updated_at.isoformat(),
            )
        )

    # Fetch Continue Working Target
    last_repo = repo_items[0] if repo_items else None
    last_conv = conv_items[0] if conv_items else None
    latest_global_analysis = (
        db.query(AnalysisHistory)
        .filter(AnalysisHistory.user_id == current_user.id)
        .order_by(AnalysisHistory.created_at.desc())
        .first()
    )

    continue_working = ContinueWorkingTarget(
        last_repository=last_repo,
        last_conversation=last_conv,
        last_analysis_at=latest_global_analysis.created_at.isoformat() if latest_global_analysis else None,
    )

    # Fetch Stats
    user_stats_data = get_user_stats(db, current_user.id)
    # Total AI questions asked across all messages
    ai_questions_count = (
        db.query(AIChatMessage)
        .join(AIChatSession)
        .filter(AIChatSession.user_id == current_user.id, AIChatMessage.role == "user")
        .count()
    )
    user_stats_data["ai_questions_asked"] = ai_questions_count
    user_stats_data["dependencies_count"] = user_stats_data["symbols_parsed"] * 2

    # Fetch Activity Timeline
    activities = get_user_activities(db, current_user.id, limit=15)
    activity_timeline = [
        {
            "id": a.id,
            "action": a.action,
            "description": a.description,
            "timestamp": a.created_at.isoformat(),
        }
        for a in activities
    ]

    return DashboardOverviewResponse(
        greeting=greeting,
        user=UserResponse.model_validate(current_user),
        continue_working=continue_working,
        stats=user_stats_data,
        recent_repositories=repo_items,
        recent_conversations=conv_items,
        activity_timeline=activity_timeline,
    )


@router.post(
    "/repositories/{repository_id}/favorite",
    summary="Toggle repository favorite status",
    tags=["Dashboard"]
)
def toggle_repository_favorite(
    repository_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> dict:
    """Toggle favorite star on repository."""
    repo = db.query(UserRepository).filter(
        UserRepository.id == repository_id,
        UserRepository.user_id == current_user.id
    ).first()

    if not repo:
        raise HTTPException(status_code=404, detail="Repository not found")

    repo.is_favorite = not getattr(repo, "is_favorite", False)
    db.commit()
    db.refresh(repo)

    status_str = "favorited" if repo.is_favorite else "unfavorited"
    log_user_activity(db, current_user.id, f"repository_{status_str}", f"{status_str.capitalize()} repository '{repo.name}'")

    return {"repository_id": repo.id, "is_favorite": repo.is_favorite}


@router.post(
    "/repositories/{repository_id}/opened",
    summary="Record repository opened timestamp",
    tags=["Dashboard"]
)
def record_repository_opened(
    repository_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> dict:
    """Update last opened timestamp on repository."""
    repo = db.query(UserRepository).filter(
        UserRepository.id == repository_id,
        UserRepository.user_id == current_user.id
    ).first()

    if repo:
        repo.last_opened_at = datetime.now(timezone.utc)
        db.commit()
    return {"status": "success"}


@router.delete(
    "/repositories/{repository_id}",
    summary="Delete a repository and purge its storage files",
    tags=["Dashboard"]
)
def delete_repository(
    repository_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> dict:
    """Permanently delete user repository and wipe folder from disk."""
    repo = db.query(UserRepository).filter(
        UserRepository.id == repository_id,
        UserRepository.user_id == current_user.id
    ).first()

    if not repo:
        raise HTTPException(status_code=404, detail="Repository not found")

    repo_name = repo.name
    # Delete storage path
    storage_dir = Path(settings.REPO_STORAGE_DIR) / current_user.id / repository_id
    if storage_dir.exists():
        shutil.rmtree(storage_dir, ignore_errors=True)

    db.delete(repo)
    db.commit()

    log_user_activity(db, current_user.id, "repository_deleted", f"Deleted repository '{repo_name}'")
    return {"detail": f"Repository '{repo_name}' deleted successfully"}


@router.post(
    "/ai/chat/sessions/{session_id}/pin",
    summary="Toggle AI chat conversation pin status",
    tags=["Dashboard"]
)
def toggle_conversation_pin(
    session_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> dict:
    """Toggle pinned status of a conversation."""
    sess = db.query(AIChatSession).filter(
        AIChatSession.id == session_id,
        AIChatSession.user_id == current_user.id
    ).first()

    if not sess:
        raise HTTPException(status_code=404, detail="Chat session not found")

    sess.is_pinned = not getattr(sess, "is_pinned", False)
    db.commit()
    db.refresh(sess)

    status_str = "pinned" if sess.is_pinned else "unpinned"
    return {"session_id": sess.id, "is_pinned": sess.is_pinned}


@router.patch(
    "/ai/chat/sessions/{session_id}",
    summary="Rename conversation title",
    tags=["Dashboard"]
)
def rename_conversation(
    session_id: str,
    request: RenameConversationRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> dict:
    """Rename an AI chat session title."""
    sess = db.query(AIChatSession).filter(
        AIChatSession.id == session_id,
        AIChatSession.user_id == current_user.id
    ).first()

    if not sess:
        raise HTTPException(status_code=404, detail="Chat session not found")

    sess.title = request.title.strip()
    db.commit()
    db.refresh(sess)

    return {"session_id": sess.id, "title": sess.title}


@router.delete(
    "/ai/chat/sessions/{session_id}",
    summary="Delete an AI chat conversation",
    tags=["Dashboard"]
)
def delete_conversation(
    session_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> dict:
    """Delete an AI chat session and its message threads."""
    sess = db.query(AIChatSession).filter(
        AIChatSession.id == session_id,
        AIChatSession.user_id == current_user.id
    ).first()

    if not sess:
        raise HTTPException(status_code=404, detail="Chat session not found")

    title = sess.title
    db.delete(sess)
    db.commit()

    log_user_activity(db, current_user.id, "conversation_deleted", f"Deleted conversation '{title}'")
    return {"detail": "Conversation deleted successfully"}

"""
User Account & Profile router for Phase 13 Production Account Center.
Handles profile updates, preferences, notifications, avatar management, security,
active sessions, user activity, stats, privacy exports, and account deletion.
"""

import base64
from typing import List, Optional
from fastapi import APIRouter, Depends, File, Query, Request, Response, UploadFile, status
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.models.auth import User
from app.models.auth_schemas import (
    ChangePasswordRequest,
    CheckAvailabilityResponse,
    DeleteAccountConfirmRequest,
    ProfileUpdateRequest,
    UserActivityResponse,
    UserPreferencesSchema,
    UserPreferencesUpdate,
    UserResponse,
    UserSessionResponse,
    UserStatsResponse,
)
from app.services.auth_service import get_current_user
from app.services.user_service import (
    change_user_password,
    clear_user_history,
    delete_user_account,
    export_user_account_data,
    get_or_create_user_preferences,
    get_user_activities,
    get_user_by_email,
    get_user_by_username,
    get_user_sessions,
    get_user_stats,
    terminate_all_other_sessions,
    terminate_user_session,
    unlink_user_provider,
    update_user_preferences,
    update_user_profile,
)

router = APIRouter(prefix="/users", tags=["User Account"])


@router.patch(
    "/profile",
    response_model=UserResponse,
    summary="Update authenticated user profile"
)
def update_profile(
    request: ProfileUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> UserResponse:
    """Update display name, username, email, or avatar URL."""
    updated = update_user_profile(
        db=db,
        user=current_user,
        display_name=request.display_name,
        username=request.username,
        email=request.email,
        avatar_url=request.avatar_url,
    )
    return UserResponse.model_validate(updated)


@router.get(
    "/check-username",
    response_model=CheckAvailabilityResponse,
    summary="Check username availability for live validation"
)
def check_username(
    username: str = Query(..., min_length=1),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> CheckAvailabilityResponse:
    """Check if username is available."""
    clean = username.strip()
    if clean.lower() == current_user.username.lower():
        return CheckAvailabilityResponse(available=True, message="Current username")
    existing = get_user_by_username(db, clean)
    if existing:
        return CheckAvailabilityResponse(available=False, message="Username is already taken")
    return CheckAvailabilityResponse(available=True, message="Username is available")


@router.get(
    "/check-email",
    response_model=CheckAvailabilityResponse,
    summary="Check email availability for live validation"
)
def check_email(
    email: str = Query(..., min_length=1),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> CheckAvailabilityResponse:
    """Check if email address is available."""
    clean = email.strip().lower()
    if clean == current_user.email.lower():
        return CheckAvailabilityResponse(available=True, message="Current email address")
    existing = get_user_by_email(db, clean)
    if existing:
        return CheckAvailabilityResponse(available=False, message="Email address is already registered")
    return CheckAvailabilityResponse(available=True, message="Email address is available")


@router.post(
    "/avatar",
    response_model=UserResponse,
    summary="Upload user avatar image"
)
async def upload_avatar(
    req_obj: Request,
    file: Optional[UploadFile] = File(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> UserResponse:
    """Upload new profile avatar image (supports file upload or data URL)."""
    data_url = None
    if file:
        content = await file.read()
        b64 = base64.b64encode(content).decode("utf-8")
        content_type = file.content_type or "image/png"
        data_url = f"data:{content_type};base64,{b64}"
    else:
        try:
            body = await req_obj.json()
            if isinstance(body, dict) and "avatar_url" in body:
                data_url = body["avatar_url"]
        except Exception:
            pass

    updated = update_user_profile(
        db=db,
        user=current_user,
        avatar_url=data_url
    )
    return UserResponse.model_validate(updated)


@router.delete(
    "/avatar",
    response_model=UserResponse,
    summary="Remove user avatar image"
)
def remove_avatar(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> UserResponse:
    """Remove avatar image URL, restoring initials fallback."""
    updated = update_user_profile(
        db=db,
        user=current_user,
        avatar_url=""
    )
    return UserResponse.model_validate(updated)


@router.post(
    "/change-password",
    summary="Change user password with current password verification"
)
def change_password(
    request: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> dict:
    """Update password with verification of current password."""
    change_user_password(
        db=db,
        user=current_user,
        new_password_raw=request.new_password,
        current_password_raw=request.current_password
    )
    return {"detail": "Password changed successfully"}


@router.get(
    "/sessions",
    response_model=List[UserSessionResponse],
    summary="Get active user sessions"
)
def get_sessions(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> List[UserSessionResponse]:
    """Retrieve all active login sessions for user."""
    sessions = get_user_sessions(db, current_user.id)
    return [UserSessionResponse.model_validate(s) for s in sessions]


@router.delete(
    "/sessions/{session_id}",
    summary="Terminate a specific active session"
)
def terminate_session(
    session_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> dict:
    """Terminate specific session by ID."""
    success = terminate_user_session(db, current_user.id, session_id)
    if not success:
        return JSONResponse(status_code=404, content={"detail": "Session not found"})
    return {"detail": "Session terminated successfully"}


@router.delete(
    "/sessions",
    summary="Terminate all other active sessions"
)
def terminate_other_sessions(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> dict:
    """Terminate all sessions except current session."""
    count = terminate_all_other_sessions(db, current_user.id)
    return {"detail": f"Terminated {count} other active session(s)"}


@router.get(
    "/preferences",
    response_model=UserPreferencesSchema,
    summary="Get user settings and notification preferences"
)
def get_preferences(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> UserPreferencesSchema:
    """Retrieve account preferences and notifications configuration."""
    prefs = get_or_create_user_preferences(db, current_user.id)
    return UserPreferencesSchema.model_validate(prefs)


@router.patch(
    "/preferences",
    response_model=UserPreferencesSchema,
    summary="Update user settings and notification preferences"
)
def update_preferences(
    request: UserPreferencesUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> UserPreferencesSchema:
    """Update account preferences and notification settings."""
    updates = request.model_dump(exclude_unset=True)
    updated = update_user_preferences(db, current_user.id, updates)
    return UserPreferencesSchema.model_validate(updated)


@router.get(
    "/activity",
    response_model=List[UserActivityResponse],
    summary="Get recent user activity timeline"
)
def get_activity(
    limit: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> List[UserActivityResponse]:
    """Retrieve audit log of user activity."""
    activities = get_user_activities(db, current_user.id, limit=limit)
    return [UserActivityResponse.model_validate(a) for a in activities]


@router.get(
    "/stats",
    response_model=UserStatsResponse,
    summary="Get real user repository and account statistics"
)
def get_stats(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> UserStatsResponse:
    """Retrieve real repository statistics."""
    stats = get_user_stats(db, current_user.id)
    return UserStatsResponse(**stats)


@router.get(
    "/export",
    summary="Export complete user account data as downloadable JSON"
)
def export_account_data(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Download full JSON payload of user account data."""
    export_payload = export_user_account_data(db, current_user)
    return JSONResponse(
        content=export_payload,
        headers={
            "Content-Disposition": f'attachment; filename="commitit-account-export-{current_user.username}.json"'
        }
    )


@router.delete(
    "/history",
    summary="Selectively clear chat, repository, or disconnected repository history"
)
def clear_history(
    type: str = Query(..., description="Type of history to clear: 'chat', 'repository', 'disconnect_repos'"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> dict:
    """Clear specific user history category."""
    return clear_user_history(db, current_user.id, type)


@router.post(
    "/unlink-provider",
    response_model=UserResponse,
    summary="Unlink connected authentication provider"
)
def unlink_provider(
    payload: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> UserResponse:
    """Unlink connected provider (e.g. google)."""
    provider = payload.get("provider", "google")
    updated = unlink_user_provider(db, current_user, provider)
    return UserResponse.model_validate(updated)


@router.delete(
    "/account",
    summary="Delete user account and cascade associated data"
)
def delete_account(
    response: Response,
    request: Optional[DeleteAccountConfirmRequest] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> dict:
    """Permanently delete user account and clear auth cookies."""
    confirm_user = request.confirm_username if request else None
    pass_confirm = request.password if request else None

    delete_user_account(
        db=db,
        user_id=current_user.id,
        confirm_username=confirm_user,
        password=pass_confirm
    )
    response.delete_cookie(key="access_token")
    response.delete_cookie(key="refresh_token", path="/api/v1/auth/refresh")
    return {"detail": "Account deleted successfully"}


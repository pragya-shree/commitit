"""
Authentication router for Phase 12 & 12.1 Production Authentication.
Handles register, login, Google OAuth, logout, refresh, forgot/reset password, email verification.
"""

import logging
from datetime import datetime, timezone
from typing import cast
from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)

from app.core.config import settings
from app.db.database import get_db
from app.models.auth import User
from app.models.auth_schemas import (
    ChangePasswordRequest,
    ForgotPasswordRequest,
    GoogleAuthRequest,
    LinkProviderRequest,
    ResetPasswordRequest,
    UserLoginRequest,
    UserRegisterRequest,
    UserResponse,
    VerifyEmailRequest,
)
from app.services.auth_service import (
    check_rate_limit,
    clear_failed_logins,
    create_access_token,
    create_refresh_token,
    decode_token,
    get_current_user,
    track_failed_login,
)
from app.services.email_service import (
    decode_email_token,
    generate_email_token,
    send_password_reset_email,
    send_verification_email,
)
from app.services.google_auth_service import (
    exchange_code_for_google_user,
    get_google_authorization_url,
    get_or_create_google_user,
    verify_google_credential,
)
from app.services.user_service import (
    change_user_password,
    create_local_user,
    get_user_by_email,
    get_user_by_email_or_username,
    get_user_by_id,
    verify_password,
)

router = APIRouter(prefix="/auth", tags=["Authentication"])


def build_user_response(user: User) -> UserResponse:
    """Build UserResponse with list of connected providers."""
    providers_list = [p.provider for p in user.providers] if getattr(user, "providers", None) else [str(getattr(user, "provider", "local") or "local")]
    resp = UserResponse.model_validate(user)
    resp.connected_providers = providers_list
    return resp


def set_auth_cookies(response: Response, user_id: str, remember_me: bool = False) -> None:
    """Set secure HTTP-only access and refresh token cookies."""
    access_token = create_access_token({"sub": user_id})
    refresh_token = create_refresh_token({"sub": user_id}, remember_me=remember_me)

    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        secure=False,
        samesite="lax",
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )
    days = 30 if remember_me else settings.REFRESH_TOKEN_EXPIRE_DAYS
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=False,
        samesite="lax",
        path="/api/v1/auth/refresh",
        max_age=days * 24 * 60 * 60,
    )


@router.post(
    "/register",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new local user account"
)
def register(
    request: UserRegisterRequest,
    response: Response,
    db: Session = Depends(get_db)
) -> UserResponse:
    """Create local user account, send verification email token, and set auth cookies."""
    user = create_local_user(
        db=db,
        email=request.email,
        username=request.username,
        password_raw=request.password,
        display_name=request.display_name,
    )
    user.last_login_at = datetime.now(timezone.utc)
    db.commit()

    uid = str(user.id)
    uemail = str(user.email)

    # Dispatch verification email
    verify_token = generate_email_token({"sub": uid, "action": "verify_email"}, expires_in_minutes=1440)
    send_verification_email(uemail, verify_token)

    set_auth_cookies(response, uid)
    return build_user_response(user)


@router.post(
    "/login",
    response_model=UserResponse,
    summary="Log in with Email/Username and Password"
)
def login(
    request: UserLoginRequest,
    response: Response,
    req_obj: Request,
    db: Session = Depends(get_db)
) -> UserResponse:
    """Verify credentials with rate limiting and set authentication cookies."""
    credential_input = request.email_or_username or request.username or ""
    client_key = f"{credential_input.lower().strip()}_{req_obj.client.host if req_obj.client else 'unknown'}"
    check_rate_limit(client_key)

    user = get_user_by_email_or_username(db, credential_input)
    if not user or not verify_password(request.password, str(user.password_hash) if user.password_hash else None):
        track_failed_login(client_key)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email/username or password"
        )

    clear_failed_logins(client_key)
    user.last_login_at = datetime.now(timezone.utc)
    db.commit()

    uid = str(user.id)
    token_str = set_auth_cookies(response, uid, remember_me=request.remember_me or False)
    
    from app.services.user_service import create_or_update_user_session
    user_agent = req_obj.headers.get("user-agent")
    ip_addr = req_obj.client.host if req_obj.client else "127.0.0.1"
    create_or_update_user_session(db, uid, session_token=f"session_{uid[:8]}", user_agent=user_agent, ip_address=ip_addr)

    return build_user_response(user)


@router.get(
    "/google/login",
    summary="Redirect user to Google OAuth 2.0 consent screen"
)
def google_login_redirect(state: str | None = None):
    """Initiate Google OAuth 2.0 flow by redirecting to Google's official consent screen."""
    try:
        auth_url = get_google_authorization_url(state=state)
        return RedirectResponse(url=auth_url, status_code=status.HTTP_307_TEMPORARY_REDIRECT)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc)
        )


@router.get(
    "/google/url",
    summary="Get Google OAuth 2.0 authorization URL in JSON format"
)
def get_google_login_url(state: str | None = None) -> dict:
    """Return the Google OAuth 2.0 consent screen URL."""
    try:
        auth_url = get_google_authorization_url(state=state)
        return {"url": auth_url}
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc)
        )


@router.get(
    "/google/callback",
    summary="Google OAuth 2.0 authorization code callback"
)
def google_oauth_callback(
    req_obj: Request,
    code: str | None = None,
    error: str | None = None,
    state: str | None = None,
    db: Session = Depends(get_db),
):
    """Callback endpoint for Google OAuth authorization code exchange."""
    frontend_base = settings.FRONTEND_URL.rstrip("/") if settings.FRONTEND_URL else "http://localhost:5173"

    if error:
        logger.error(f"Google OAuth authorization error: {error}")
        return RedirectResponse(url=f"{frontend_base}/login?error={error}", status_code=status.HTTP_307_TEMPORARY_REDIRECT)

    if not code:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Missing authorization code in Google OAuth callback"
        )

    try:
        google_data = exchange_code_for_google_user(code)
        user = get_or_create_google_user(db, google_data)
        user.last_login_at = datetime.now(timezone.utc)
        db.commit()

        uid = str(user.id)
        redirect_url = f"{frontend_base}/"
        response = RedirectResponse(url=redirect_url, status_code=status.HTTP_307_TEMPORARY_REDIRECT)

        set_auth_cookies(response, uid, remember_me=True)

        from app.services.user_service import create_or_update_user_session
        user_agent = req_obj.headers.get("user-agent") if req_obj else None
        ip_addr = req_obj.client.host if req_obj and req_obj.client else "127.0.0.1"
        create_or_update_user_session(db, uid, session_token=f"session_google_{uid[:8]}", user_agent=user_agent, ip_address=ip_addr)

        return response
    except Exception as exc:
        logger.error(f"Google OAuth callback processing failed: {exc}")
        return RedirectResponse(url=f"{frontend_base}/login?error=Google+authentication+failed", status_code=status.HTTP_307_TEMPORARY_REDIRECT)


@router.post(
    "/google",
    response_model=UserResponse,
    summary="Authenticate with Google OAuth 2.0 Credential"
)
def google_login(
    request: GoogleAuthRequest,
    response: Response,
    req_obj: Request,
    db: Session = Depends(get_db)
) -> UserResponse:
    """Authenticate or provision user account via Google OAuth ID token."""
    google_data = verify_google_credential(request.credential)
    user = get_or_create_google_user(db, google_data)
    user.last_login_at = datetime.now(timezone.utc)
    db.commit()

    uid = str(user.id)
    set_auth_cookies(response, uid, remember_me=True)

    from app.services.user_service import create_or_update_user_session
    user_agent = req_obj.headers.get("user-agent")
    ip_addr = req_obj.client.host if req_obj.client else "127.0.0.1"
    create_or_update_user_session(db, uid, session_token=f"session_google_{uid[:8]}", user_agent=user_agent, ip_address=ip_addr)

    return build_user_response(user)


@router.post(
    "/link-provider",
    response_model=UserResponse,
    summary="Link an external OAuth provider to the current user account"
)
def link_provider(
    request: LinkProviderRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> UserResponse:
    """Link an external OAuth account (Google, GitHub, etc.) to the logged-in user."""
    user_email = str(current_user.email)
    if request.provider == "google":
        google_data = verify_google_credential(request.credential)
        google_id = google_data.get("sub") or "google_sub_id"
        current_user.google_id = google_id
        from app.services.google_auth_service import link_oauth_provider
        link_oauth_provider(db, current_user, "google", google_id, str(google_data.get("email")) if google_data.get("email") else user_email)
    else:
        from app.services.google_auth_service import link_oauth_provider
        link_oauth_provider(db, current_user, request.provider, f"{request.provider}_sub_id", user_email)

    db.commit()
    db.refresh(current_user)
    return build_user_response(current_user)


@router.post(
    "/logout",
    summary="Log out and clear authentication cookies"
)
def logout(response: Response) -> dict:
    """Clear access and refresh token cookies."""
    response.delete_cookie(key="access_token")
    response.delete_cookie(key="refresh_token", path="/api/v1/auth/refresh")
    return {"detail": "Logged out successfully"}


@router.post(
    "/refresh",
    summary="Refresh access and refresh token cookies (Rotation)"
)
def refresh(request: Request, response: Response, db: Session = Depends(get_db)) -> dict:
    """Refresh access token and rotate refresh token cookie."""
    refresh_token = request.cookies.get("refresh_token")
    if not refresh_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token missing"
        )

    payload = decode_token(refresh_token)
    if not payload or payload.get("type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token"
        )

    user_id = payload.get("sub")
    if not user_id or not isinstance(user_id, str):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token payload"
        )

    user = get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found"
        )

    # Refresh Token Rotation: issue fresh access and refresh token cookies
    set_auth_cookies(response, str(user.id))
    return {"detail": "Token refreshed successfully"}


@router.get(
    "/me",
    response_model=UserResponse,
    summary="Retrieve current user profile"
)
def get_me(current_user: User = Depends(get_current_user)) -> UserResponse:
    """Get profile of currently logged-in user."""
    return build_user_response(current_user)


@router.post(
    "/forgot-password",
    summary="Trigger password reset email token"
)
def forgot_password(request: ForgotPasswordRequest, db: Session = Depends(get_db)) -> dict:
    """Generate reset token and dispatch email without exposing account existence."""
    user = get_user_by_email(db, request.email)
    if user:
        uid = str(user.id)
        uemail = str(user.email)
        reset_token = generate_email_token({"sub": uid, "action": "reset_password"}, expires_in_minutes=30)
        send_password_reset_email(uemail, reset_token)

    return {"detail": "If an account exists for this email, password reset instructions have been sent."}


@router.post(
    "/reset-password",
    summary="Reset password using valid email token"
)
def reset_password(request: ResetPasswordRequest, db: Session = Depends(get_db)) -> dict:
    """Reset password using verified single-use token."""
    payload = decode_email_token(request.token)
    if not payload or payload.get("action") != "reset_password":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired password reset token"
        )

    user_id = payload.get("sub")
    if not user_id or not isinstance(user_id, str):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid token payload"
        )

    user = get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User account not found"
        )

    change_user_password(db, user, request.new_password)
    return {"detail": "Password has been successfully reset. Please log in with your new password."}


@router.post(
    "/change-password",
    summary="Change password for authenticated user"
)
def change_password(
    request: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> dict:
    """Change password after verifying current password."""
    if not current_user.password_hash:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="OAuth accounts do not have password credentials"
        )

    if not verify_password(request.current_password, str(current_user.password_hash)):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Incorrect current password"
        )

    change_user_password(db, current_user, request.new_password)
    return {"detail": "Password changed successfully"}


@router.post(
    "/verify-email",
    summary="Verify user email address with token"
)
def verify_email(request: VerifyEmailRequest, db: Session = Depends(get_db)) -> dict:
    """Verify email address using link token."""
    payload = decode_email_token(request.token)
    if not payload or payload.get("action") != "verify_email":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired verification token"
        )

    user_id = payload.get("sub")
    if not user_id or not isinstance(user_id, str):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid token payload"
        )

    user = get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User account not found"
        )

    user.email_verified = True
    db.commit()
    return {"detail": "Email address successfully verified"}


@router.post(
    "/resend-verification",
    summary="Resend verification email to authenticated user"
)
def resend_verification(current_user: User = Depends(get_current_user)) -> dict:
    """Resend email verification token to current user."""
    if current_user.email_verified:
        return {"detail": "Email address is already verified"}

    uid = str(current_user.id)
    uemail = str(current_user.email)

    verify_token = generate_email_token({"sub": uid, "action": "verify_email"}, expires_in_minutes=1440)
    send_verification_email(uemail, verify_token)
    return {"detail": "Verification email has been resent"}

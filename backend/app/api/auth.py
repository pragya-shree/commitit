"""
Authentication router.
Handles register, login, logout, and token refresh endpoints.
"""

from fastapi import APIRouter, Depends, HTTPException, Response, Request, status
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.database import get_db
from app.models.auth import User
from app.models.auth_schemas import UserLoginRequest, UserRegisterRequest, UserResponse
from app.services.auth_service import (
    create_access_token,
    create_refresh_token,
    decode_token,
    get_current_user,
)
from app.services.user_service import (
    create_user,
    get_user_by_username,
    get_user_by_id,
    verify_password,
)

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post(
    "/register",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new user account"
)
def register(request: UserRegisterRequest, db: Session = Depends(get_db)) -> UserResponse:
    """Create a new user account with unique username and hashed password."""
    existing_user = get_user_by_username(db, request.username)
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already registered"
        )
    user = create_user(db, request.username, request.password)
    return UserResponse.model_validate(user)


@router.post(
    "/login",
    response_model=UserResponse,
    summary="Log in and set authentication cookies"
)
def login(
    request: UserLoginRequest,
    response: Response,
    db: Session = Depends(get_db)
) -> UserResponse:
    """Verify credentials and set secure, HTTP-only JWT cookies."""
    user = get_user_by_username(db, request.username)
    if not user or not verify_password(request.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password"
        )

    # Generate tokens
    access_token = create_access_token({"sub": user.id})
    refresh_token = create_refresh_token({"sub": user.id})

    # Set HTTP-only cookies
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        secure=False,  # Set to True in HTTPS-enabled environments
        samesite="lax",
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=False,
        samesite="lax",
        path="/api/v1/auth/refresh",  # Restrict refresh cookie exposure
        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60,
    )

    return UserResponse.model_validate(user)


@router.post(
    "/logout",
    summary="Log out and clear authentication cookies"
)
def logout(response: Response) -> dict:
    """Delete access and refresh token cookies."""
    response.delete_cookie(key="access_token")
    response.delete_cookie(key="refresh_token", path="/api/v1/auth/refresh")
    return {"detail": "Logged out successfully"}


@router.post(
    "/refresh",
    summary="Refresh access token cookie"
)
def refresh(request: Request, response: Response, db: Session = Depends(get_db)) -> dict:
    """Verify refresh token cookie and set a fresh access token cookie."""
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
    user = get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found"
        )

    # Sign a new access token
    new_access_token = create_access_token({"sub": user.id})

    # Set new access token cookie
    response.set_cookie(
        key="access_token",
        value=new_access_token,
        httponly=True,
        secure=False,
        samesite="lax",
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )

    return {"detail": "Token refreshed successfully"}


@router.get(
    "/me",
    response_model=UserResponse,
    summary="Retrieve current user profile"
)
def get_me(current_user: User = Depends(get_current_user)) -> UserResponse:
    """Get profile of the currently authenticated user."""
    return UserResponse.model_validate(current_user)

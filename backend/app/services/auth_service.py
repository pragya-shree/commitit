"""
Authentication Service for Phase 12 Production Authentication.
Handles JWT signing, token decoding, cookie parsing, rate limiting, and FastAPI security dependencies.
"""

from datetime import datetime, timezone, timedelta
from typing import Dict, List
import jwt
from fastapi import Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.database import get_db
from app.models.auth import User, UserRepository
from app.services.user_service import get_user_by_id

# Error responses
CREDENTIALS_EXCEPTION = HTTPException(
    status_code=status.HTTP_401_UNAUTHORIZED,
    detail="Not authenticated",
    headers={"WWW-Authenticate": "Bearer"},
)

# In-memory Rate Limiting & Account Lockout Tracker
_failed_login_attempts: Dict[str, List[datetime]] = {}
MAX_FAILED_ATTEMPTS = 5
LOCKOUT_WINDOW_MINUTES = 5


def track_failed_login(key: str) -> None:
    """Record a failed login attempt for an email/username/IP."""
    now = datetime.now(timezone.utc)
    if key not in _failed_login_attempts:
        _failed_login_attempts[key] = []

    # Clean old attempts outside window
    window_start = now - timedelta(minutes=LOCKOUT_WINDOW_MINUTES)
    _failed_login_attempts[key] = [t for t in _failed_login_attempts[key] if t > window_start]
    _failed_login_attempts[key].append(now)


def check_rate_limit(key: str) -> None:
    """Check if account/IP is locked out due to repeated failures."""
    now = datetime.now(timezone.utc)
    window_start = now - timedelta(minutes=LOCKOUT_WINDOW_MINUTES)
    attempts = [t for t in _failed_login_attempts.get(key, []) if t > window_start]
    _failed_login_attempts[key] = attempts

    if len(attempts) >= MAX_FAILED_ATTEMPTS:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Too many failed login attempts. Please try again in {LOCKOUT_WINDOW_MINUTES} minutes."
        )


def clear_failed_logins(key: str) -> None:
    """Clear failure history on successful login."""
    _failed_login_attempts.pop(key, None)


def create_access_token(data: dict) -> str:
    """Generate a short-lived access token JWT."""
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire, "type": "access"})
    return jwt.encode(to_encode, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


def create_refresh_token(data: dict, remember_me: bool = False) -> str:
    """Generate a refresh token JWT (7 days or 30 days for remember me)."""
    to_encode = data.copy()
    days = 30 if remember_me else settings.REFRESH_TOKEN_EXPIRE_DAYS
    expire = datetime.now(timezone.utc) + timedelta(days=days)
    to_encode.update({"exp": expire, "type": "refresh"})
    return jwt.encode(to_encode, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


def decode_token(token: str) -> dict | None:
    """Decode and validate a JWT. Returns payload dictionary or None if invalid/expired."""
    try:
        payload = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
        return payload
    except jwt.PyJWTError:
        return None


def get_current_user(request: Request, db: Session = Depends(get_db)) -> User:
    """
    Composable dependency to extract, validate, and return the logged-in User.
    Inspects HTTP-only cookies first, falling back to Authorization Header.
    """
    token = request.cookies.get("access_token")
    if not token:
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header[7:]

    if not token:
        raise CREDENTIALS_EXCEPTION

    payload = decode_token(token)
    if not payload or payload.get("type") != "access":
        raise CREDENTIALS_EXCEPTION

    user_id = payload.get("sub")
    if not user_id:
        raise CREDENTIALS_EXCEPTION

    user = get_user_by_id(db, user_id)
    if not user:
        raise CREDENTIALS_EXCEPTION

    return user


def get_optional_user(request: Request, db: Session = Depends(get_db)) -> User | None:
    """
    Extract, validate, and return the logged-in User if present,
    or None for public / unauthenticated requests.
    """
    token = request.cookies.get("access_token")
    if not token:
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header[7:]

    if not token:
        return None

    payload = decode_token(token)
    if not payload or payload.get("type") != "access":
        return None

    user_id = payload.get("sub")
    if not user_id:
        return None

    return get_user_by_id(db, user_id)


def require_repository_owner(
    repository_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> UserRepository:
    """
    Composable dependency to verify that the logged-in user owns the requested repository.
    """
    repo = db.query(UserRepository).filter(UserRepository.id == repository_id).first()
    if not repo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Repository not found"
        )

    if repo.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: You do not own this repository"
        )

    return repo


def allow_repository_access(
    repository_id: str,
    current_user: User | None = Depends(get_optional_user),
    db: Session = Depends(get_db)
) -> UserRepository:
    """
    Composable dependency to verify that a repository exists and can be accessed for inspection.
    Allows logged-in users AND public repository exploration.
    """
    repo = db.query(UserRepository).filter(UserRepository.id == repository_id).first()
    if repo:
        return repo

    from app.core.config import settings
    from pathlib import Path
    storage_base = Path(settings.REPO_STORAGE_DIR)
    if storage_base.exists():
        for user_dir in storage_base.iterdir():
            if user_dir.is_dir() and (user_dir / str(repository_id)).exists():
                return UserRepository(
                    id=repository_id,
                    user_id=current_user.id if current_user else "anonymous",
                    name=repository_id,
                    github_owner="github",
                    github_repo=repository_id,
                    github_url=f"https://github.com/public/{repository_id}",
                    default_branch="main"
                )

    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail=f"Repository '{repository_id}' not found."
    )

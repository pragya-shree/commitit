"""
Authentication service.
Handles JWT signing, token decoding, cookie parsing, and composable FastAPI dependencies.
"""

from datetime import datetime, timezone, timedelta
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


def create_access_token(data: dict) -> str:
    """Generate a short-lived access token JWT."""
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire, "type": "access"})
    return jwt.encode(to_encode, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


def create_refresh_token(data: dict) -> str:
    """Generate a long-lived refresh token JWT."""
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
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
    Inspects HTTP-only cookies first.
    """
    token = request.cookies.get("access_token")
    if not token:
        # Fall back to Authorization Header (useful for Swagger API docs and tests)
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


def require_repository_owner(
    repository_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> UserRepository:
    """
    Composable dependency to verify that the logged-in user owns the requested repository.
    Raises 404 if not found, or 403 if it belongs to another user.
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

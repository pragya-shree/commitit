"""
User management service.
Handles registration, password hashing/verification, and user data queries.
"""

import bcrypt
from sqlalchemy.orm import Session

from app.models.auth import User


def hash_password(password: str) -> str:
    """Hash a password using bcrypt."""
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password.encode("utf-8"), salt)
    return hashed.decode("utf-8")


def verify_password(password: str, hashed_password: str) -> bool:
    """Verify a raw password against its bcrypt hash."""
    try:
        return bcrypt.checkpw(
            password.encode("utf-8"),
            hashed_password.encode("utf-8")
        )
    except Exception:
        return False


def get_user_by_username(db: Session, username: str) -> User | None:
    """Retrieve a user record by username (case-insensitive check)."""
    return db.query(User).filter(User.username == username).first()


def get_user_by_id(db: Session, user_id: str) -> User | None:
    """Retrieve a user record by primary key UUID."""
    return db.query(User).filter(User.id == user_id).first()


def create_user(db: Session, username: str, password_raw: str) -> User:
    """Create and save a new user record in the database."""
    password_hash = hash_password(password_raw)
    user = User(username=username, password_hash=password_hash)
    db.add(user)
    db.commit()
    db.refresh(user)
    return user

"""
SQLAlchemy ORM models for Users, User-scoped Repositories, and Analysis History.
"""

import uuid
from datetime import datetime, timezone

from typing import Optional
from sqlalchemy import Boolean, ForeignKey, String, Text, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.database import Base
from app.models.ai_chat import AIChatSession


def generate_uuid() -> str:
    """Generate a standard UUID string."""
    return str(uuid.uuid4())


class UserAuthProvider(Base):
    """Stores linked authentication providers for a user account (Local, Google, GitHub, Microsoft)."""

    __tablename__ = "user_auth_providers"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    provider: Mapped[str] = mapped_column(String(30), nullable=False)  # 'local', 'google', 'github', 'microsoft'
    provider_user_id: Mapped[str] = mapped_column(String(100), nullable=False)
    provider_email: Mapped[str] = mapped_column(String(100), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="providers")


class User(Base):
    """Represents a CommitIt application user with multi-provider authentication support."""

    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    email: Mapped[str] = mapped_column(String(100), unique=True, index=True, nullable=False)
    username: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)
    display_name: Mapped[str] = mapped_column(String(100), nullable=False)
    password_hash: Mapped[str] = mapped_column(String(100), nullable=True)
    provider: Mapped[str] = mapped_column(String(20), nullable=True, default="local")
    google_id: Mapped[str] = mapped_column(String(100), unique=True, index=True, nullable=True)
    avatar_url: Mapped[str] = mapped_column(String(255), nullable=True)
    email_verified: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)
    last_login_at: Mapped[datetime] = mapped_column(DateTime, nullable=True)

    # Relationships
    providers: Mapped[list["UserAuthProvider"]] = relationship("UserAuthProvider", back_populates="user", cascade="all, delete-orphan", lazy="selectin")
    repositories: Mapped[list["UserRepository"]] = relationship("UserRepository", back_populates="owner", cascade="all, delete-orphan")
    analyses: Mapped[list["AnalysisHistory"]] = relationship("AnalysisHistory", back_populates="user", cascade="all, delete-orphan")
    chat_sessions: Mapped[list["AIChatSession"]] = relationship("AIChatSession", back_populates="user", cascade="all, delete-orphan")
    preferences: Mapped["UserPreferences"] = relationship("UserPreferences", back_populates="user", cascade="all, delete-orphan", uselist=False, lazy="selectin")
    sessions: Mapped[list["UserSession"]] = relationship("UserSession", back_populates="user", cascade="all, delete-orphan", lazy="selectin")
    activities: Mapped[list["UserActivity"]] = relationship("UserActivity", back_populates="user", cascade="all, delete-orphan", lazy="selectin")

    def __init__(self, **kwargs):
        if "username" in kwargs:
            if "email" not in kwargs or not kwargs["email"]:
                kwargs["email"] = f"{kwargs['username']}@commitit.local"
            if "display_name" not in kwargs or not kwargs["display_name"]:
                kwargs["display_name"] = kwargs["username"]
        super().__init__(**kwargs)


class UserPreferences(Base):
    """User account settings and notification preferences."""

    __tablename__ = "user_preferences"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    theme: Mapped[str] = mapped_column(String(20), nullable=False, default="dark")
    accent_color: Mapped[str] = mapped_column(String(20), nullable=False, default="indigo")
    reduced_motion: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    compact_mode: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    default_dashboard_view: Mapped[str] = mapped_column(String(30), nullable=False, default="overview")
    default_repository_view: Mapped[str] = mapped_column(String(30), nullable=False, default="code")
    ai_response_length: Mapped[str] = mapped_column(String(20), nullable=False, default="balanced")

    notify_security_alerts: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    notify_product_updates: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    notify_repo_analysis: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    notify_weekly_summary: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    notify_ai_tips: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    updated_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    user: Mapped["User"] = relationship("User", back_populates="preferences")


class UserSession(Base):
    """Tracks active login sessions for security and session management."""

    __tablename__ = "user_sessions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    session_token: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    user_agent: Mapped[str] = mapped_column(String(255), nullable=True)
    ip_address: Mapped[str] = mapped_column(String(45), nullable=True)
    browser: Mapped[str] = mapped_column(String(50), nullable=False, default="Chrome")
    os: Mapped[str] = mapped_column(String(50), nullable=False, default="Windows")
    device: Mapped[str] = mapped_column(String(50), nullable=False, default="Desktop")
    is_current: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    last_active_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    user: Mapped["User"] = relationship("User", back_populates="sessions")


class UserActivity(Base):
    """Audit log of user actions and events."""

    __tablename__ = "user_activities"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    action: Mapped[str] = mapped_column(String(50), nullable=False)
    description: Mapped[str] = mapped_column(String(255), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    user: Mapped["User"] = relationship("User", back_populates="activities")


class UserRepository(Base):
    """Represents a Git repository cloned and managed by a user."""

    __tablename__ = "user_repositories"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    github_owner: Mapped[str] = mapped_column(String(100), nullable=False)
    github_repo: Mapped[str] = mapped_column(String(100), nullable=False)
    github_url: Mapped[str] = mapped_column(String(255), nullable=False)
    default_branch: Mapped[str] = mapped_column(String(50), nullable=False, default="main")
    is_favorite: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    primary_language: Mapped[str] = mapped_column(String(50), nullable=True, default="Python")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    last_opened_at: Mapped[datetime] = mapped_column(DateTime, nullable=True)

    # Relationships
    owner: Mapped["User"] = relationship("User", back_populates="repositories")
    analyses: Mapped[list["AnalysisHistory"]] = relationship("AnalysisHistory", back_populates="repository", cascade="all, delete-orphan")
    chat_sessions: Mapped[list["AIChatSession"]] = relationship("AIChatSession", back_populates="repository", cascade="all, delete-orphan")


class AnalysisHistory(Base):
    """Represents a historical run of the quality scanner on a repository."""

    __tablename__ = "analysis_history"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    repository_id: Mapped[str] = mapped_column(String(36), ForeignKey("user_repositories.id", ondelete="CASCADE"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    summary_metadata: Mapped[str] = mapped_column(Text, nullable=False)  # Stored as serialized JSON string for dashboard trend mapping

    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="analyses")
    repository: Mapped["UserRepository"] = relationship("UserRepository", back_populates="analyses")



"""
SQLAlchemy ORM models for Users, User-scoped Repositories, and Analysis History.
"""

import uuid
from datetime import datetime, timezone

from sqlalchemy import ForeignKey, String, Text, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.database import Base


def generate_uuid() -> str:
    """Generate a standard UUID string."""
    return str(uuid.uuid4())


class User(Base):
    """Represents a CommitIt application user."""

    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    username: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(100), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    repositories: Mapped[list["UserRepository"]] = relationship("UserRepository", back_populates="owner", cascade="all, delete-orphan")
    analyses: Mapped[list["AnalysisHistory"]] = relationship("AnalysisHistory", back_populates="user", cascade="all, delete-orphan")


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
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    owner: Mapped["User"] = relationship("User", back_populates="repositories")
    analyses: Mapped[list["AnalysisHistory"]] = relationship("AnalysisHistory", back_populates="repository", cascade="all, delete-orphan")


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


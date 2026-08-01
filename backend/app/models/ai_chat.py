"""
SQLAlchemy ORM models for AI Chat Sessions, Messages, and Tool Call Invocations.
"""

from datetime import datetime, timezone
import uuid
from typing import List, TYPE_CHECKING

from sqlalchemy import Boolean, ForeignKey, String, Text, DateTime, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.database import Base

if TYPE_CHECKING:
    from app.models.auth import User, UserRepository


def generate_uuid() -> str:
    """Generate a standard UUID string."""
    return str(uuid.uuid4())


class AIChatSession(Base):
    """Represents a conversational session associated with a repository and user."""

    __tablename__ = "ai_chat_sessions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    repository_id: Mapped[str] = mapped_column(String(36), ForeignKey("user_repositories.id", ondelete="CASCADE"), nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False, default="New Conversation")
    provider_name: Mapped[str] = mapped_column(String(50), nullable=False, default="gemini")
    model_name: Mapped[str] = mapped_column(String(100), nullable=False, default="gemini-1.5-flash")
    is_pinned: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    last_message_preview: Mapped[str] = mapped_column(String(255), nullable=True)
    session_metadata: Mapped[str] = mapped_column(Text, nullable=True)  # JSON string for system prompts, params, etc.
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="chat_sessions")
    repository: Mapped["UserRepository"] = relationship("UserRepository", back_populates="chat_sessions")
    messages: Mapped[List["AIChatMessage"]] = relationship("AIChatMessage", back_populates="session", cascade="all, delete-orphan", order_by="AIChatMessage.created_at")


class AIChatMessage(Base):
    """Represents a single message in an AI conversation (user, assistant, tool, or system)."""

    __tablename__ = "ai_chat_messages"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    session_id: Mapped[str] = mapped_column(String(36), ForeignKey("ai_chat_sessions.id", ondelete="CASCADE"), nullable=False, index=True)
    role: Mapped[str] = mapped_column(String(20), nullable=False)  # user, assistant, system, tool
    content: Mapped[str] = mapped_column(Text, nullable=False)
    tokens_used: Mapped[int] = mapped_column(Integer, nullable=True)
    message_metadata: Mapped[str] = mapped_column(Text, nullable=True)  # JSON string for extra flags, references
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    session: Mapped["AIChatSession"] = relationship("AIChatSession", back_populates="messages")
    tool_calls: Mapped[List["AIChatToolCall"]] = relationship("AIChatToolCall", back_populates="message", cascade="all, delete-orphan", order_by="AIChatToolCall.created_at")


class AIChatToolCall(Base):
    """Represents a capability tool invocation executed during a message turn."""

    __tablename__ = "ai_chat_tool_calls"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    message_id: Mapped[str] = mapped_column(String(36), ForeignKey("ai_chat_messages.id", ondelete="CASCADE"), nullable=False, index=True)
    tool_name: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    arguments_json: Mapped[str] = mapped_column(Text, nullable=False)  # Serialized JSON string of parameters
    result_json: Mapped[str] = mapped_column(Text, nullable=True)  # Serialized JSON result payload
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="success")  # success, error, pending
    error_message: Mapped[str] = mapped_column(Text, nullable=True)
    execution_time_ms: Mapped[int] = mapped_column(Integer, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    message: Mapped["AIChatMessage"] = relationship("AIChatMessage", back_populates="tool_calls")

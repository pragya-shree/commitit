"""
Pydantic models for the LLM-powered AI explanation endpoint (Milestone 9).
"""

from pydantic import BaseModel


class AIExplainRequest(BaseModel):
    """Request body for the AI explanation endpoint."""

    question: str
    provider: str | None = None
    """
    Optional explicit provider name: "gemini", "mock", or "deterministic".
    If omitted, the default provider is chosen automatically (Gemini if
    configured, otherwise the deterministic Explanation Engine).
    """


class AIExplainResponse(BaseModel):
    """Response from the AI explanation endpoint."""

    success: bool
    repository_id: str
    provider: str
    answer: str
    fallback_used: bool

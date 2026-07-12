"""
Pydantic models for the Explanation Engine (Milestone 8).

These describe a deterministic, structured "explanation object" built
purely from Context Builder output (app.models.context.ContextObject).
Every field is plain, human-readable text or a small structured list —
no LLM or external AI service is involved. This is the abstraction layer
a future milestone can swap in an LLM behind without changing callers.
"""

from pydantic import BaseModel

from app.models.context import ContextRequest


class ExplanationRequest(ContextRequest):
    """Request body: a natural-language question about the repository."""


class FileExplanation(BaseModel):
    """A human-readable explanation of a single relevant file."""

    path: str
    explanation: str


class ClassExplanation(BaseModel):
    """A human-readable explanation of a single relevant class."""

    name: str
    module: str
    explanation: str


class FunctionExplanation(BaseModel):
    """A human-readable explanation of a single relevant function/method."""

    name: str
    module: str
    explanation: str


class DependencyExplanation(BaseModel):
    """A human-readable explanation of one symbol's dependency relationships."""

    symbol: str
    explanation: str


class ExplanationObject(BaseModel):
    """The full, deterministic explanation object handed back to the caller."""

    question: str
    repository_overview: str
    architecture_overview: str
    file_explanations: list[FileExplanation]
    class_explanations: list[ClassExplanation]
    function_explanations: list[FunctionExplanation]
    dependency_explanations: list[DependencyExplanation]
    summary: str


class ExplanationResponse(BaseModel):
    """API response wrapper for the Explanation Engine endpoint."""

    success: bool
    repository_id: str
    explanation: ExplanationObject

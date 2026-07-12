"""
Pydantic models for the AI Context Builder (Milestone 7).

These describe a deterministic, structured "context object" assembled
from the cached Knowledge Model in response to a natural-language
question. Nothing here calls an LLM or external AI service — the
"context" is just a relevance-ranked digest of existing repository data,
meant to be handed to an LLM by a future milestone.
"""

from pydantic import BaseModel

from app.models.graph import DependencyGraphSummary, GraphEdge
from app.models.parser import ParsedArgument, ParseSummary
from app.models.repository import RepositoryMetadata, ScanSummary


class ContextRequest(BaseModel):
    """Request body: a natural-language question about the repository."""

    question: str


class ContextFile(BaseModel):
    """A file relevant to the question, with a simple relevance score."""

    path: str
    score: int


class ContextClass(BaseModel):
    """A class relevant to the question, with a simple relevance score."""

    name: str
    module: str
    bases: list[str]
    docstring: str | None = None
    methods: list[str]
    score: int


class ContextFunction(BaseModel):
    """A function/method relevant to the question, with a relevance score."""

    name: str
    module: str
    qualified_name: str
    args: list[ParsedArgument]
    returns: str | None = None
    docstring: str | None = None
    score: int


class ContextImport(BaseModel):
    """An import relationship relevant to the question, with a relevance score."""

    module: str
    imported: str
    score: int


class ContextRelationship(BaseModel):
    """Dependency edges for one symbol judged relevant to the question."""

    symbol: str
    outgoing: list[GraphEdge]
    incoming: list[GraphEdge]


class ContextSummary(BaseModel):
    """Aggregate counts describing how much context was assembled."""

    keywords_used: int
    matched_files: int
    matched_classes: int
    matched_functions: int
    matched_imports: int
    matched_relationships: int


class ContextObject(BaseModel):
    """The full, deterministic context object handed back to the caller."""

    question: str
    keywords: list[str]
    repository: RepositoryMetadata
    files: list[ContextFile]
    classes: list[ContextClass]
    functions: list[ContextFunction]
    imports: list[ContextImport]
    relationships: list[ContextRelationship]
    languages: dict[str, int]
    scan_summary: ScanSummary
    parse_summary: ParseSummary
    graph_summary: DependencyGraphSummary
    summary: ContextSummary


class ContextResponse(BaseModel):
    """API response wrapper for the Context Builder endpoint."""

    success: bool
    repository_id: str
    context: ContextObject

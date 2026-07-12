"""
Pydantic models for the Semantic Repository Query Engine (Milestone 6).

These describe the shape of query results only — the queries themselves
run entirely against an already-built KnowledgeModel in memory, so
nothing here triggers scanning, parsing, or graph-building.
"""

from pydantic import BaseModel

from app.models.graph import GraphEdge
from app.models.parser import ParsedArgument


class SymbolResult(BaseModel):
    """A class or function/method matched by a symbol lookup."""

    name: str
    type: str  # "class" | "function"
    module: str
    qualified_name: str
    docstring: str | None = None


class ClassResult(BaseModel):
    """A single class definition matched by a query."""

    name: str
    module: str
    bases: list[str]
    docstring: str | None = None
    methods: list[str]


class FunctionResult(BaseModel):
    """A single function or method matched by a query."""

    name: str
    module: str
    qualified_name: str
    args: list[ParsedArgument]
    returns: str | None = None
    docstring: str | None = None


class ImportResult(BaseModel):
    """A single import edge: which module imports what."""

    module: str
    imported: str


class FileResult(BaseModel):
    """A single file path matched by a query, from the cached project tree."""

    path: str


class RelationshipsResult(BaseModel):
    """Incoming and outgoing dependency edges for a resolved symbol."""

    symbol: str
    matched_node_ids: list[str]
    outgoing: list[GraphEdge]
    incoming: list[GraphEdge]


class SearchResult(BaseModel):
    """Aggregate search results across repository metadata and all symbol types."""

    query: str
    repository_match: bool
    files: list[FileResult]
    classes: list[ClassResult]
    functions: list[FunctionResult]
    imports: list[ImportResult]


class SymbolsResponse(BaseModel):
    success: bool
    repository_id: str
    count: int
    results: list[SymbolResult]


class ClassesResponse(BaseModel):
    success: bool
    repository_id: str
    count: int
    results: list[ClassResult]


class FunctionsResponse(BaseModel):
    success: bool
    repository_id: str
    count: int
    results: list[FunctionResult]


class ImportsResponse(BaseModel):
    success: bool
    repository_id: str
    count: int
    results: list[ImportResult]


class FilesResponse(BaseModel):
    success: bool
    repository_id: str
    count: int
    results: list[FileResult]


class RelationshipsResponse(BaseModel):
    success: bool
    repository_id: str
    relationships: RelationshipsResult


class SearchResponse(BaseModel):
    success: bool
    repository_id: str
    search: SearchResult

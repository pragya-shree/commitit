"""
Pydantic models for the dependency graph feature (Milestone 4B).
"""

from pydantic import BaseModel


class GraphNode(BaseModel):
    """A single node in the dependency graph: a module, class, or function."""

    id: str
    type: str  # "module" | "class" | "function"
    name: str


class GraphEdge(BaseModel):
    """A single relationship between two nodes."""

    source: str
    target: str
    relationship: str  # "imports" | "inherits" | "calls"


class DependencyGraphSummary(BaseModel):
    """Aggregate counts for a dependency graph."""

    total_nodes: int
    total_edges: int


class DependencyGraphResponse(BaseModel):
    """Response returned after building a repository's dependency graph."""

    success: bool
    repository_id: str
    summary: DependencyGraphSummary
    nodes: list[GraphNode]
    edges: list[GraphEdge]

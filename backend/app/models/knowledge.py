"""
Pydantic models for the Repository Knowledge Model (Milestone 5).

The Knowledge Model is the single, unified representation of an
analyzed repository: metadata, scan results, parsed Python source, and
the dependency graph, all in one object. Fields reuse the existing
response models from each feature area instead of redefining them.
"""

from datetime import datetime

from pydantic import BaseModel

from app.models.graph import DependencyGraphSummary, GraphEdge, GraphNode
from app.models.parser import ParsedModule, ParseSummary
from app.models.repository import LargestFile, RepositoryMetadata, ScanSummary, TreeNode


class KnowledgeModel(BaseModel):
    """The complete, unified analysis of a single repository."""

    repository_id: str
    version: str = "1.0"
    created_at: datetime

    # Repository metadata (from git_service, no local paths).
    repository: RepositoryMetadata

    # Scanner results.
    scan_summary: ScanSummary
    languages: dict[str, int]
    largest_files: list[LargestFile]
    tree: TreeNode

    # Parser results.
    parse_summary: ParseSummary
    modules: list[ParsedModule]

    # Dependency graph.
    graph_summary: DependencyGraphSummary
    nodes: list[GraphNode]
    edges: list[GraphEdge]


class KnowledgeResponse(BaseModel):
    """API response wrapper for the Knowledge Model endpoint."""

    success: bool
    knowledge: KnowledgeModel

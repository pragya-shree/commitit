"""
Pydantic response models for the reusable Impact Analysis Engine.
"""

from typing import Literal
from pydantic import BaseModel


SemanticNodeState = Literal["selected", "direct", "indirect", "unaffected"]


class TargetInfo(BaseModel):
    """Information about the selected target node (file, folder, or symbol)."""

    id: str
    name: str
    type: Literal["folder", "file", "symbol"]
    path: str | None = None


class ImpactMetrics(BaseModel):
    """Quantitative metrics describing the blast radius and centrality of a target."""

    total_dependents: int
    direct_dependents_count: int
    indirect_dependents_count: int
    dependency_depth: int
    fan_in: int
    fan_out: int
    centrality_score: float  # 0.0 to 1.0 relative graph centrality
    entry_point_count: int
    affected_files_count: int


class ExplainabilityFactor(BaseModel):
    """A structured factor explaining why a particular impact score was calculated."""

    category: str  # e.g. "Dependents", "Depth", "Centrality", "Entry Point", "Convergence"
    title: str
    description: str
    impact_level: Literal["positive", "high", "neutral", "warning"]


class DependencyChain(BaseModel):
    """A representative path showing why a file or symbol is affected."""

    target_id: str
    dependent_id: str
    steps: list[str]
    formatted: str


class AffectedFile(BaseModel):
    """A file affected directly or indirectly by changes to the target."""

    path: str
    impact_type: Literal["direct", "indirect"]
    symbol_count: int


class AffectedSymbol(BaseModel):
    """A symbol (class/function/module) affected directly or indirectly."""

    id: str
    name: str
    type: str
    file_path: str
    impact_type: Literal["direct", "indirect"]


class GraphNodeImpactState(BaseModel):
    """Semantic graph node state for UI rendering."""

    node_id: str
    state: SemanticNodeState
    node_type: str


class ImpactAnalysisResult(BaseModel):
    """Complete, structured output of the Impact Analysis Engine."""

    target: TargetInfo
    impact_score: float  # 0.0 to 100.0
    criticality: Literal["LOW", "MEDIUM", "HIGH", "CRITICAL"]
    metrics: ImpactMetrics
    explainability: list[ExplainabilityFactor]
    reasons: list[str]  # Human and AI-readable bullet points
    dependency_chains: list[DependencyChain]
    affected_files: list[AffectedFile]
    affected_symbols: list[AffectedSymbol]
    graph_states: list[GraphNodeImpactState]
    folder_states: dict[str, SemanticNodeState]


class ImpactResponse(BaseModel):
    """API response wrapper for Impact Analysis endpoint."""

    success: bool
    repository_id: str
    impact: ImpactAnalysisResult

"""
Pydantic models for Phase 4 Deep Repository Reasoning Engine.

Defines structured data contracts for:
1. Execution Flow Tracing
2. Architectural Relationship & Cross-Module Reasoning
3. Feature Placement Recommendations
4. Design Pattern Recognition
5. Architectural Trade-off & Technical Debt Analysis
6. Intelligent Entity Comparisons
"""

from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class ExecutionTraceStep(BaseModel):
    """Represents a single hop in an execution flow sequence."""
    step_number: int
    layer: str  # Entry Route, Middleware, Service, Helper, Model/Database, Response
    file_path: str
    symbol_name: Optional[str] = None
    action_description: str
    called_symbol: Optional[str] = None


class ExecutionTraceResult(BaseModel):
    """Complete execution flow trace across repository layers."""
    query: str
    target: str
    entry_point: Optional[str] = None
    steps: List[ExecutionTraceStep] = Field(default_factory=list)
    call_chain: List[str] = Field(default_factory=list)
    summary_text: str


class ArchitecturalRelationshipResult(BaseModel):
    """Cross-module dependency chain and communication analysis."""
    topic: str
    dependency_chain: List[str] = Field(default_factory=list)
    communicating_modules: List[Dict[str, Any]] = Field(default_factory=list)
    explanation: str


class FeaturePlacementRecommendation(BaseModel):
    """Architectural recommendation for placing new capabilities in the codebase."""
    feature_name: str
    recommended_directory: str
    recommended_file: str
    target_layer: str  # API Layer, Service Layer, Utility Layer, Middleware Layer
    suggested_pattern: str  # Fast API Dependency, Middleware Interceptor, Service Decorator, etc.
    existing_reference_files: List[str] = Field(default_factory=list)
    integration_steps: List[str] = Field(default_factory=list)
    rationale: str


class DesignPatternInfo(BaseModel):
    """Details of a recognized software design pattern in the repository."""
    pattern_name: str  # Layered Architecture, Repository Pattern, Factory, Strategy, Dependency Injection, Event-driven
    category: str  # Architectural, Creational, Structural, Behavioral
    matching_files: List[str] = Field(default_factory=list)
    matching_symbols: List[str] = Field(default_factory=list)
    explanation: str
    benefits: str


class DesignPatternAnalysisResult(BaseModel):
    """Comprehensive design pattern recognition analysis across the codebase."""
    detected_patterns: List[DesignPatternInfo] = Field(default_factory=list)
    primary_architecture_style: str
    summary_text: str


class ArchitecturalTradeoffResult(BaseModel):
    """Coupling, scalability, and technical debt evaluation result."""
    overall_scalability_score: str  # High, Medium, Low
    highly_coupled_modules: List[Dict[str, Any]] = Field(default_factory=list)
    refactoring_candidates: List[Dict[str, Any]] = Field(default_factory=list)
    technical_debt_hotspots: List[str] = Field(default_factory=list)
    circular_dependency_warnings: List[str] = Field(default_factory=list)
    tradeoff_summary: str


class IntelligentComparisonResult(BaseModel):
    """Structured side-by-side comparison of two files, modules, or services."""
    entity_a: str
    entity_b: str
    similarities: List[str] = Field(default_factory=list)
    differences: List[str] = Field(default_factory=list)
    responsibilities_a: List[str] = Field(default_factory=list)
    responsibilities_b: List[str] = Field(default_factory=list)
    structural_coupling: str
    summary_text: str

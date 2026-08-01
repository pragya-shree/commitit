"""
Base interface, standardized response models, and helper utilities for AI Assistant Plugin Tools.
"""

from abc import ABC, abstractmethod
from typing import Any, Dict, List, Optional, Literal
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field

from app.models.ai import ToolDeclaration, ToolParametersSchema, ToolParameterProperty
from app.models.knowledge import KnowledgeModel
from app.services import knowledge_service, repository_store


def get_knowledge_for_tool(repository_id: str, db: Session) -> KnowledgeModel:
    """
    Safely retrieve cached KnowledgeModel or resolve path and build it.
    Tries memory cache first, then registered path, then DB resolution.
    """
    try:
        return knowledge_service.get_required(repository_id)
    except Exception:
        pass

    try:
        local_path = repository_store.get_path(repository_id)
        return knowledge_service.get_or_build(repository_id, local_path)
    except Exception:
        pass

    _, resolved_path = repository_store.resolve(repository_id, db)
    return knowledge_service.get_or_build(repository_id, resolved_path)


class ToolExecutionResponse(BaseModel):
    """
    Standardized structured response payload returned by every tool execution.
    Consumable by both the LLM context engine and front-end evidence UI.
    """
    tool_name: str
    status: Literal["success", "error"] = "success"
    summary: str
    data: Dict[str, Any] = Field(default_factory=dict)
    evidence: Dict[str, Any] = Field(default_factory=dict)
    referenced_files: List[str] = Field(default_factory=list)
    referenced_symbols: List[str] = Field(default_factory=list)
    suggested_followups: List[str] = Field(default_factory=list)
    error_message: Optional[str] = None
    execution_time_ms: Optional[int] = None


class BaseTool(ABC):
    """
    Plugin-oriented base interface for AI Assistant Tools.

    Each tool must specify:
    - name: Unique identifier (e.g. 'search_universe')
    - display_name: Human-readable title
    - description: Clear explanation of what the tool does and when the LLM should invoke it
    - parameters_schema: Input parameters JSON schema
    - output_schema: Output payload JSON schema
    - execute: Core capability execution method returning a ToolExecutionResponse dictionary
    """

    name: str
    display_name: str = ""
    description: str
    parameters_schema: Dict[str, Any]
    output_schema: Dict[str, Any]

    @abstractmethod
    def execute(self, repository_id: str, db: Session, **kwargs) -> Dict[str, Any]:
        """
        Execute tool capability against a repository.
        Must return a dict matching ToolExecutionResponse.
        """
        pass

    def to_declaration(self) -> ToolDeclaration:
        """Convert tool metadata to an LLM provider-friendly ToolDeclaration schema."""
        props = {}
        required = self.parameters_schema.get("required", [])
        raw_props = self.parameters_schema.get("properties", {})

        for k, v in raw_props.items():
            props[k] = ToolParameterProperty(
                type=v.get("type", "string"),
                description=v.get("description"),
                enum=v.get("enum"),
            )

        return ToolDeclaration(
            name=self.name,
            description=f"{self.display_name}: {self.description}",
            parameters=ToolParametersSchema(
                type="object",
                properties=props,
                required=required,
            ),
            output_schema=self.output_schema,
        )

    def validate_inputs(self, kwargs: Dict[str, Any]) -> Optional[str]:
        """
        Validate input arguments against required fields in parameters_schema.
        Returns an error string if validation fails, or None if valid.
        """
        required_fields = self.parameters_schema.get("required", [])
        for field in required_fields:
            if field not in kwargs or kwargs[field] is None or kwargs[field] == "":
                return f"Missing required parameter '{field}' for tool '{self.name}'."
        return None

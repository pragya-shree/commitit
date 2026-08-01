"""
Central Plugin-Oriented Tool Registry for AI Assistant capabilities.
Supports dynamic registration, automatic plugin discovery, declaration export, and observational execution.
"""

import time
from typing import Dict, List, Optional
from sqlalchemy.orm import Session

from app.core.logging import get_logger
from app.models.ai import ToolDeclaration, ToolCallResult
from app.services.tools.base import BaseTool, ToolExecutionResponse

logger = get_logger(__name__)


class ToolRegistryError(Exception):
    """Base exception for tool registry errors."""
    pass


class DuplicateToolError(ToolRegistryError):
    """Raised when registering a tool whose name is already registered."""
    pass


class ToolNotFoundError(ToolRegistryError):
    """Raised when attempting to access an unregistered tool."""
    pass


class ToolRegistry:
    """
    Central registry orchestrating tool lookup, declaration export, and execution.
    The AI Assistant communicates ONLY with the ToolRegistry, never directly with domain services.
    """

    def __init__(self, auto_load_defaults: bool = True):
        self._tools: Dict[str, BaseTool] = {}
        if auto_load_defaults:
            self.load_default_tools()

    def load_default_tools(self) -> None:
        """Dynamically load and register all built-in capability tools."""
        from app.services.tools.impl.search_tool import UniverseSearchTool
        from app.services.tools.impl.start_here_tool import StartHereTool
        from app.services.tools.impl.impact_tool import ImpactRadarTool
        from app.services.tools.impl.heatmap_tool import HeatMapTool
        from app.services.tools.impl.health_tool import RepoHealthTool
        from app.services.tools.impl.technology_tool import TechnologyDetectionTool
        from app.services.tools.impl.discoveries_tool import RecentDiscoveriesTool

        default_tools = [
            UniverseSearchTool(),
            StartHereTool(),
            ImpactRadarTool(),
            HeatMapTool(),
            RepoHealthTool(),
            TechnologyDetectionTool(),
            RecentDiscoveriesTool(),
        ]

        for tool in default_tools:
            if tool.name not in self._tools:
                self.register(tool)

    def register(self, tool: BaseTool) -> None:
        """Register a tool instance. Raises DuplicateToolError if already registered."""
        if tool.name in self._tools:
            raise DuplicateToolError(f"Tool with name '{tool.name}' is already registered.")
        self._tools[tool.name] = tool
        disp_name = getattr(tool, "display_name", tool.name) or tool.name
        logger.info(f"Registered AI Assistant tool: {tool.name} ({disp_name})")

    def unregister(self, tool_name: str) -> None:
        """Unregister a tool by name."""
        if tool_name not in self._tools:
            raise ToolNotFoundError(f"Tool '{tool_name}' is not registered.")
        del self._tools[tool_name]

    def get_tool(self, tool_name: str) -> BaseTool:
        """Retrieve a registered tool by name."""
        if tool_name not in self._tools:
            raise ToolNotFoundError(f"Tool '{tool_name}' is not registered.")
        return self._tools[tool_name]

    def list_tools(self) -> List[BaseTool]:
        """List all registered tools."""
        return list(self._tools.values())

    def list_tool_names(self) -> List[str]:
        """List names of all registered tools."""
        return list(self._tools.keys())

    def get_declarations(self) -> List[ToolDeclaration]:
        """Export all registered tool declarations for LLM providers."""
        return [tool.to_declaration() for tool in self._tools.values()]

    def execute_tool(
        self,
        tool_name: str,
        repository_id: str,
        db: Session,
        **kwargs
    ) -> ToolCallResult:
        """
        Safely execute a registered tool, measure execution time, and log observability data.
        Validates inputs and handles exceptions gracefully without raising unhandled errors.
        """
        start_time = time.perf_counter()
        try:
            tool = self.get_tool(tool_name)

            # Input validation check
            val_err = tool.validate_inputs(kwargs)
            if val_err:
                execution_time_ms = int((time.perf_counter() - start_time) * 1000)
                err_payload = ToolExecutionResponse(
                    tool_name=tool_name,
                    status="error",
                    summary=val_err,
                    error_message=val_err,
                    execution_time_ms=execution_time_ms,
                ).model_dump()
                return ToolCallResult(
                    tool_name=tool_name,
                    status="error",
                    result=err_payload,
                    error_message=val_err,
                    execution_time_ms=execution_time_ms,
                )

            # Execute capability
            raw_response = tool.execute(repository_id=repository_id, db=db, **kwargs)
            execution_time_ms = int((time.perf_counter() - start_time) * 1000)
            raw_response["execution_time_ms"] = execution_time_ms

            status = raw_response.get("status", "success")
            err_msg = raw_response.get("error_message")

            return ToolCallResult(
                tool_name=tool_name,
                status=status,
                result=raw_response,
                error_message=err_msg,
                execution_time_ms=execution_time_ms,
            )

        except Exception as exc:
            execution_time_ms = int((time.perf_counter() - start_time) * 1000)
            logger.error(f"Error executing tool '{tool_name}': {exc}", exc_info=True)
            err_payload = ToolExecutionResponse(
                tool_name=tool_name,
                status="error",
                summary=f"Tool execution failed: {exc}",
                error_message=str(exc),
                execution_time_ms=execution_time_ms,
            ).model_dump()

            return ToolCallResult(
                tool_name=tool_name,
                status="error",
                result=err_payload,
                error_message=str(exc),
                execution_time_ms=execution_time_ms,
            )


# Global singleton tool registry instance for default application use
global_tool_registry = ToolRegistry(auto_load_defaults=True)

"""
Recent Discoveries Tool Plugin for AI Assistant.
Wraps discovery_service to retrieve Git history landmarks, commit activity, and codebase events.
"""

from typing import Any, Dict
from sqlalchemy.orm import Session

from app.services.tools.base import BaseTool, ToolExecutionResponse, get_knowledge_for_tool


class RecentDiscoveriesTool(BaseTool):
    """Git history and landmark discoveries tool."""

    name = "get_recent_discoveries"
    display_name = "Recent Discoveries"
    description = "Retrieves recent git commit activity, codebase landmark events, and recent discoveries."
    parameters_schema = {
        "type": "object",
        "properties": {},
        "required": [],
    }
    output_schema = {
        "type": "object",
        "properties": {
            "status": {"type": "string"},
            "summary": {"type": "string"},
            "data": {"type": "object"},
        },
    }

    def execute(self, repository_id: str, db: Session, **kwargs) -> Dict[str, Any]:
        try:
            knowledge = get_knowledge_for_tool(repository_id, db)
        except Exception as exc:
            return ToolExecutionResponse(
                tool_name=self.name,
                status="error",
                summary=f"Failed to access repository: {exc}",
                error_message=str(exc),
            ).model_dump()

        discoveries = knowledge.recent_discoveries

        summary_text = (
            f"Retrieved {len(discoveries)} recent discovery/landmark entry(ies) for '{knowledge.repository.name}'."
        )

        entries = [
            {
                "id": getattr(d, "id", str(i)),
                "title": getattr(d, "title", ""),
                "description": getattr(d, "description", ""),
                "icon": getattr(d, "icon", "git-commit"),
                "color": getattr(d, "color", "coral"),
                "timestamp": getattr(d, "timestamp", ""),
            }
            for i, d in enumerate(discoveries)
        ]

        return ToolExecutionResponse(
            tool_name=self.name,
            status="success",
            summary=summary_text,
            data={
                "repository_name": knowledge.repository.name,
                "discoveries": entries,
            },
            evidence={"discovery_count": len(discoveries)},
            suggested_followups=[
                "Where should I start contributing?",
                "Show risky or complex modules",
            ],
        ).model_dump()

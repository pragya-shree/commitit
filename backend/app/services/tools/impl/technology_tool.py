"""
Technology Stack Tool Plugin for AI Assistant.
Wraps technology_service to detect languages, frameworks, tooling, and infrastructure.
"""

from typing import Any, Dict
from sqlalchemy.orm import Session

from app.services.tools.base import BaseTool, ToolExecutionResponse, get_knowledge_for_tool


class TechnologyDetectionTool(BaseTool):
    """Technology stack detection tool."""

    name = "get_technologies"
    display_name = "Technology Stack"
    description = "Detects programming languages, frameworks, tooling, and infrastructure used across the codebase."
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

        tech_list = knowledge.technologies
        tech_names = [t.name for t in tech_list]
        languages = list(knowledge.languages.keys())

        summary_text = (
            f"Detected primary language(s): {', '.join(languages) if languages else 'Unknown'}. "
            f"Found {len(tech_names)} integration/framework technology entry(ies)."
        )

        return ToolExecutionResponse(
            tool_name=self.name,
            status="success",
            summary=summary_text,
            data={
                "languages": knowledge.languages,
                "technologies": [{"name": t.name, "category": t.category} for t in tech_list],
            },
            evidence={"language_count": len(languages), "technology_count": len(tech_names)},
            suggested_followups=[
                "Where should I start contributing?",
                "Check repository health score",
            ],
        ).model_dump()

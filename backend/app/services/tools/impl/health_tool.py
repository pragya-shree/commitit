"""
Repository Health Tool Plugin for AI Assistant.
Wraps health_service to calculate overall codebase health, maintainability, and structural debt scores.
"""

from typing import Any, Dict
from sqlalchemy.orm import Session

from app.services.tools.base import BaseTool, ToolExecutionResponse, get_knowledge_for_tool


class RepoHealthTool(BaseTool):
    """Repository health and structural debt analysis tool."""

    name = "get_repository_health"
    display_name = "Repository Health"
    description = "Retrieves structural health metrics, architecture complexity, doc coverage, and overall maintainability scores."
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

        indicators = knowledge.health_indicators
        scores = [h.score for h in indicators if hasattr(h, "score")]
        avg_score = round(sum(scores) / len(scores), 1) if scores else 85.0

        status_label = "excellent" if avg_score >= 90 else ("good" if avg_score >= 70 else "needs-attention")

        summary_text = (
            f"Repository health score is {avg_score}/100 ({status_label}). "
            f"Evaluated {len(indicators)} structural indicator(s)."
        )

        indicator_data = [
            {"label": h.label, "score": h.score, "status": h.status, "description": h.description}
            for h in indicators
        ]

        return ToolExecutionResponse(
            tool_name=self.name,
            status="success",
            summary=summary_text,
            data={
                "overall_score": avg_score,
                "status": status_label,
                "indicators": indicator_data,
            },
            evidence={"indicator_count": len(indicators)},
            suggested_followups=[
                "Show risky or complex modules",
                "Where should I start contributing?",
            ],
        ).model_dump()

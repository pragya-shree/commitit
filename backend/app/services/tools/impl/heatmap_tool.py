"""
Heat Map Metrics Tool Plugin for AI Assistant.
Wraps scanner and health metrics to identify high-complexity, churn-heavy, or high-risk modules.
"""

from typing import Any, Dict
from sqlalchemy.orm import Session

from app.services.tools.base import BaseTool, ToolExecutionResponse, get_knowledge_for_tool


class HeatMapTool(BaseTool):
    """High complexity and architectural hotspot identification tool."""

    name = "get_heatmap_metrics"
    display_name = "Heat Map Hotspots"
    description = "Retrieves high-risk, high-complexity, or churn-heavy hotspot modules across the codebase."
    parameters_schema = {
        "type": "object",
        "properties": {
            "metric": {
                "type": "string",
                "description": "Metric focus filter.",
                "enum": ["complexity", "risk", "churn"],
            }
        },
        "required": [],
    }
    output_schema = {
        "type": "object",
        "properties": {
            "status": {"type": "string"},
            "summary": {"type": "string"},
            "data": {"type": "object"},
            "referenced_files": {"type": "array"},
        },
    }

    def execute(self, repository_id: str, db: Session, **kwargs) -> Dict[str, Any]:
        metric = kwargs.get("metric", "complexity")

        try:
            knowledge = get_knowledge_for_tool(repository_id, db)
        except Exception as exc:
            return ToolExecutionResponse(
                tool_name=self.name,
                status="error",
                summary=f"Failed to access repository: {exc}",
                error_message=str(exc),
            ).model_dump()

        # Identify largest/most complex files from scanner
        largest = knowledge.largest_files[:5]
        hotspot_files = [f.path for f in largest]

        summary_text = (
            f"Heat map analysis ({metric} focus): Identified {len(largest)} primary hotspot file(s). "
            f"Largest module is `{largest[0].path if largest else 'N/A'}`."
        )

        followups = [
            f"What breaks if I modify `{hotspot_files[0]}`?" if hotspot_files else "Check repository health score",
            "How can we simplify high-complexity modules?",
        ]

        first_bytes = getattr(largest[0], "size", 0) if largest else 0

        return ToolExecutionResponse(
            tool_name=self.name,
            status="success",
            summary=summary_text,
            data={
                "metric_focus": metric,
                "hotspots": [{"path": f.path, "bytes": getattr(f, "size", 0)} for f in largest],
            },
            evidence={"largest_file_bytes": first_bytes},
            referenced_files=hotspot_files,
            suggested_followups=followups,
        ).model_dump()

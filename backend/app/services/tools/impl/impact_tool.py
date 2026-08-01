"""
Impact Radar Tool Plugin for AI Assistant.
Wraps impact_analysis_service to calculate downstream blast radius, dependency depth, and risk scores.
"""

from typing import Any, Dict
from sqlalchemy.orm import Session

from app.services.impact_analysis_service import analyze_impact
from app.services.tools.base import BaseTool, ToolExecutionResponse, get_knowledge_for_tool


class ImpactRadarTool(BaseTool):
    """Blast radius and change impact calculation tool."""

    name = "impact_radar"
    display_name = "Impact Radar"
    description = "Calculates downstream blast radius, impacted files, and risk score when modifying a target file or symbol."
    parameters_schema = {
        "type": "object",
        "properties": {
            "target": {
                "type": "string",
                "description": "Target file path or symbol name to evaluate (e.g., 'backend/app/services/auth_service.py' or 'UserSession').",
            }
        },
        "required": ["target"],
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
        validation_error = self.validate_inputs(kwargs)
        if validation_error:
            return ToolExecutionResponse(
                tool_name=self.name,
                status="error",
                summary=validation_error,
                error_message=validation_error,
            ).model_dump()

        target = kwargs["target"]

        try:
            knowledge = get_knowledge_for_tool(repository_id, db)
        except Exception as exc:
            return ToolExecutionResponse(
                tool_name=self.name,
                status="error",
                summary=f"Failed to access repository: {exc}",
                error_message=str(exc),
            ).model_dump()

        impact_result = analyze_impact(knowledge, target)

        affected_files = [f.path for f in impact_result.affected_files]
        summary_text = (
            f"Blast radius analysis for '{target}': Risk Score {impact_result.impact_score}/100 "
            f"({impact_result.criticality} criticality). Impacted {len(affected_files)} downstream file(s)."
        )

        followups = [
            f"Show direct dependencies of `{target}`",
            "How can I refactor this file safely?",
        ]

        return ToolExecutionResponse(
            tool_name=self.name,
            status="success",
            summary=summary_text,
            data={
                "target": target,
                "impact_score": impact_result.impact_score,
                "criticality": impact_result.criticality,
                "total_dependents": impact_result.metrics.total_dependents,
                "direct_dependents_count": impact_result.metrics.direct_dependents_count,
                "affected_files": affected_files,
                "reasons": impact_result.reasons,
            },
            evidence={
                "fan_in": impact_result.metrics.fan_in,
                "fan_out": impact_result.metrics.fan_out,
                "dependency_depth": impact_result.metrics.dependency_depth,
            },
            referenced_files=[target] + affected_files[:10],
            suggested_followups=followups,
        ).model_dump()

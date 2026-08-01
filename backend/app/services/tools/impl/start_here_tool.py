"""
Start Here Tool Plugin for AI Assistant.
Wraps discovery_service and knowledge_service to provide newcomer setup and architecture entry points.
"""

from typing import Any, Dict
from sqlalchemy.orm import Session

from app.services.tools.base import BaseTool, ToolExecutionResponse, get_knowledge_for_tool


class StartHereTool(BaseTool):
    """Contributor onboarding and key entry points tool."""

    name = "get_start_here_guide"
    display_name = "Start Here Contributor Guide"
    description = "Retrieves main architectural entry points, key configuration files, and setup flow for new contributors."
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
            "referenced_files": {"type": "array"},
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

        module_paths = [m.path for m in knowledge.modules]
        key_files = [
            p for p in module_paths
            if any(p.endswith(ext) for ext in ["main.py", "App.tsx", "index.ts", "index.js", "README.md", "pyproject.toml"])
        ]
        if not key_files:
            key_files = module_paths[:5]

        tech_list = list(knowledge.languages.keys())
        summary_text = (
            f"Repository '{knowledge.repository.name}' primary language(s): {', '.join(tech_list) if tech_list else 'Unknown'}. "
            f"Identified {len(key_files)} primary entry point file(s)."
        )

        followups = [
            "Explain overall codebase architecture",
            "What external libraries does this project depend on?",
        ]
        if key_files:
            followups.append(f"Walk me through `{key_files[0]}`")

        return ToolExecutionResponse(
            tool_name=self.name,
            status="success",
            summary=summary_text,
            data={
                "repository_name": knowledge.repository.name,
                "entry_points": key_files,
                "languages": knowledge.languages,
                "total_files": knowledge.scan_summary.total_files,
            },
            evidence={"entry_point_count": len(key_files)},
            referenced_files=key_files,
            suggested_followups=followups,
        ).model_dump()

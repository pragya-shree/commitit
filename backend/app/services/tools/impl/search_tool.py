"""
Universe Search Tool Plugin for AI Assistant.
Wraps query_service to perform fuzzy and keyword code search across symbols, files, classes, and functions.
"""

from typing import Any, Dict
from sqlalchemy.orm import Session

from app.services import query_service
from app.services.tools.base import BaseTool, ToolExecutionResponse, get_knowledge_for_tool


class UniverseSearchTool(BaseTool):
    """Fuzzy and structural repository search tool."""

    name = "search_universe"
    display_name = "Universe Search"
    description = "Searches the repository for files, functions, classes, and imports matching a search query or keyword."
    parameters_schema = {
        "type": "object",
        "properties": {
            "query": {
                "type": "string",
                "description": "Fuzzy keyword or symbol name to search for (e.g. 'authentication', 'user_service').",
            },
            "category": {
                "type": "string",
                "description": "Optional category filter.",
                "enum": ["all", "files", "functions", "classes", "symbols"],
            },
        },
        "required": ["query"],
    }
    output_schema = {
        "type": "object",
        "properties": {
            "status": {"type": "string"},
            "summary": {"type": "string"},
            "data": {"type": "object"},
            "referenced_files": {"type": "array"},
            "referenced_symbols": {"type": "array"},
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

        query = kwargs["query"]
        category = kwargs.get("category", "all")

        try:
            knowledge = get_knowledge_for_tool(repository_id, db)
        except Exception as exc:
            return ToolExecutionResponse(
                tool_name=self.name,
                status="error",
                summary=f"Failed to access repository analysis: {exc}",
                error_message=str(exc),
            ).model_dump()

        search_results = query_service.multi_candidate_search(knowledge, query)

        files = search_results.get("files", [])
        classes = search_results.get("classes", [])
        functions = search_results.get("functions", [])
        symbols = search_results.get("symbols", [])

        referenced_files: list[str] = []
        for f in files:
            if "path" in f and f["path"] not in referenced_files:
                referenced_files.append(f["path"])
        for fn in functions:
            mod = fn.get("module") or fn.get("path")
            if mod:
                f_path = mod if mod.endswith(".py") else f"{mod}.py"
                if f_path not in referenced_files:
                    referenced_files.append(f_path)
        for cls in classes:
            mod = cls.get("module") or cls.get("path")
            if mod:
                f_path = mod if mod.endswith(".py") else f"{mod}.py"
                if f_path not in referenced_files:
                    referenced_files.append(f_path)

        referenced_symbols = [s["name"] for s in symbols if "name" in s]
        if not referenced_symbols:
            referenced_symbols = [fn["name"] for fn in functions if "name" in fn] + [c["name"] for c in classes if "name" in c]

        summary_text = (
            f"Found {len(files)} file(s), {len(classes)} class(es), {len(functions)} function(s), "
            f"and {len(symbols)} symbol(s) matching '{query}'."
        )

        followups = []
        if referenced_files:
            followups.append(f"What breaks if I modify `{referenced_files[0]}`?")
            followups.append(f"Explain the purpose of `{referenced_files[0]}`")

        return ToolExecutionResponse(
            tool_name=self.name,
            status="success",
            summary=summary_text,
            data={
                "query": query,
                "category": category,
                "files": files[:10],
                "classes": classes[:10],
                "functions": functions[:10],
                "symbols": symbols[:10],
            },
            evidence={"total_matches": len(files) + len(classes) + len(functions)},
            referenced_files=referenced_files[:10],
            referenced_symbols=referenced_symbols[:10],
            suggested_followups=followups,
        ).model_dump()

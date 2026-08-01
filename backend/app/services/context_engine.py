"""
Repository Context Engine.

Assembles a deterministic, structured RepositoryContext snapshot grounding the AI Assistant
in existing CommitIt analysis capabilities (KnowledgeModel, AST Parser, Dependency Graph,
Universe Search, Impact Radar, Heat Map, Technology Detection, and Repository Health).

Produces a structured RepositoryContextPayload object and formatted grounding text suitable
for LLM prompt context within strict token budgets.
"""

from pathlib import Path
from typing import Any, Dict, List, Optional

from sqlalchemy.orm import Session

from app.core.logging import get_logger
from app.models.ai import (
    RepositoryContextPayload,
    RepositoryContextManifest,
    RepositoryContextScope,
)
from app.models.auth import UserRepository
from app.models.knowledge import KnowledgeModel
from app.services import (
    context_service,
    knowledge_service,
    repository_store,
)
from app.services.impact_analysis_service import analyze_impact

logger = get_logger(__name__)

# Estimate ~4 characters per token for token budgeting
BYTES_PER_TOKEN = 4
DEFAULT_MAX_TOKEN_BUDGET = 8000


def _get_val(obj: Any, key: str, default: Any = None) -> Any:
    """Safely extract attribute or dict key."""
    if obj is None:
        return default
    if isinstance(obj, dict):
        return obj.get(key, default)
    return getattr(obj, key, default)


class RepositoryContextEngine:
    """
    Deterministic context engine assembling single-source-of-truth repository context.
    Aggregates facts from existing CommitIt engines without invoking LLMs.
    """

    def __init__(self, max_token_budget: int = DEFAULT_MAX_TOKEN_BUDGET):
        self.max_token_budget = max_token_budget

    def assemble_context(
        self,
        repository_id: str,
        db: Session,
        selected_file: Optional[str] = None,
        selected_symbol: Optional[str] = None,
        query: Optional[str] = None,
        active_nodes: Optional[List[str]] = None,
    ) -> RepositoryContextPayload:
        """
        Build a comprehensive RepositoryContextPayload for a repository.
        """
        # 1. Resolve repository record & local path
        user_repo = None
        local_path = None

        if db:
            try:
                user_repo = db.query(UserRepository).filter(UserRepository.id == repository_id).first()
            except Exception:
                pass

        try:
            local_path = repository_store.get_path(repository_id)
        except Exception:
            pass

        if not local_path or not local_path.exists():
            try:
                resolved_repo, resolved_path = repository_store.resolve(repository_id, db)
                if resolved_repo and not user_repo:
                    user_repo = resolved_repo
                local_path = resolved_path
            except Exception:
                pass

        # 2. Retrieve or build KnowledgeModel
        knowledge: Optional[KnowledgeModel] = None
        try:
            knowledge = knowledge_service.get_required(repository_id)
        except Exception:
            if local_path and local_path.exists():
                try:
                    knowledge = knowledge_service.get_or_build(repository_id, local_path)
                except Exception as exc:
                    logger.warning(f"Could not retrieve KnowledgeModel for context engine: {exc}")

        # 3. Assemble Manifest (Tier 1)
        manifest = self._build_manifest(repository_id, user_repo, local_path, knowledge)

        # 4. Assemble Scope (Tier 2)
        scope, matched_context_dict = self._build_scope(
            knowledge, selected_file, selected_symbol, query, active_nodes
        )

        # 5. Assemble Evidence (Tier 3)
        evidence = self._build_evidence(
            knowledge, selected_file, selected_symbol, matched_context_dict
        )

        # 6. Estimate Total Tokens & Construct Payload
        raw_text = self.format_grounding_text(
            RepositoryContextPayload(
                manifest=manifest,
                scope=scope,
                evidence=evidence,
                total_tokens=0,
            )
        )
        estimated_tokens = len(raw_text) // BYTES_PER_TOKEN

        return RepositoryContextPayload(
            manifest=manifest,
            scope=scope,
            evidence=evidence,
            total_tokens=estimated_tokens,
        )

    def _build_manifest(
        self,
        repository_id: str,
        user_repo: Any,
        local_path: Optional[Path],
        knowledge: Optional[KnowledgeModel],
    ) -> RepositoryContextManifest:
        """Assemble global repository manifest (languages, technologies, entry points, health)."""
        repo_name = _get_val(user_repo, "name")
        if not repo_name and knowledge:
            repo_metadata = _get_val(knowledge, "repository")
            repo_name = _get_val(repo_metadata, "name")
        if not repo_name or str(repo_name).startswith("cmt_"):
            db_name = _get_val(user_repo, "name")
            if db_name:
                repo_name = db_name
            else:
                repo_name = repo_name or repository_id

        tech_stack: List[str] = []
        entry_points: List[str] = []
        health_score: Optional[float] = None

        total_files: Optional[int] = None
        total_directories: Optional[int] = None

        if knowledge:
            scan_sum = _get_val(knowledge, "scan_summary")
            if scan_sum:
                total_files = _get_val(scan_sum, "total_files")
                total_directories = _get_val(scan_sum, "total_directories")

            # 1. Tech stack
            languages = _get_val(knowledge, "languages", {})
            if isinstance(languages, dict):
                tech_stack.extend(list(languages.keys()))
            technologies = _get_val(knowledge, "technologies", [])
            for t in technologies:
                t_name = _get_val(t, "name")
                if t_name:
                    tech_stack.append(t_name)
            tech_stack = list(dict.fromkeys(tech_stack))

            # 2. Entry points
            modules = _get_val(knowledge, "modules", [])
            module_paths = [_get_val(m, "path") for m in modules if _get_val(m, "path")]
            entry_points = [
                p for p in module_paths
                if any(p.endswith(ext) for ext in ["main.py", "App.tsx", "index.ts", "index.js", "README.md", "pyproject.toml", "utils.py"])
            ]
            if not entry_points and module_paths:
                entry_points = module_paths[:5]

            # 3. Health Score
            health_indicators = _get_val(knowledge, "health_indicators", [])
            if health_indicators:
                scores = [_get_val(h, "score") for h in health_indicators if _get_val(h, "score") is not None]
                if scores:
                    health_score = round(sum(scores) / len(scores), 1)

            if health_score is None:
                parse_sum = _get_val(knowledge, "parse_summary")
                tot_f = total_files or 0
                parsed_files = _get_val(parse_sum, "total_files", 0)
                if tot_f > 0:
                    health_score = round((parsed_files / tot_f) * 100.0, 1)

        return RepositoryContextManifest(
            repository_id=repository_id,
            name=str(repo_name),
            tech_stack=tech_stack,
            health_score=health_score,
            entry_points=entry_points,
            total_files=total_files,
            total_directories=total_directories,
        )

    def _build_scope(
        self,
        knowledge: Optional[KnowledgeModel],
        selected_file: Optional[str],
        selected_symbol: Optional[str],
        query: Optional[str],
        active_nodes: Optional[List[str]],
    ) -> tuple[RepositoryContextScope, Optional[dict]]:
        """Assemble dynamic scope based on user selection or query keywords."""
        search_snippets: List[Dict[str, Any]] = []
        matched_context_dict: Optional[dict] = None

        if knowledge and query:
            matched_context_dict = context_service.build_context(knowledge, query)
            for f in matched_context_dict.get("files", [])[:5]:
                search_snippets.append({"type": "file", "path": f["path"], "score": f.get("score", 1)})
            for c in matched_context_dict.get("classes", [])[:5]:
                search_snippets.append({"type": "class", "name": c["name"], "module": c["module"]})
            for fn in matched_context_dict.get("functions", [])[:5]:
                search_snippets.append({"type": "function", "name": fn["name"], "module": fn.get("module", "")})

        nodes = list(active_nodes) if active_nodes else []
        if selected_file and selected_file not in nodes:
            nodes.append(selected_file)

        scope = RepositoryContextScope(
            selected_file=selected_file,
            selected_symbol=selected_symbol,
            search_snippets=search_snippets,
            active_nodes=nodes,
        )

        return scope, matched_context_dict

    def _build_evidence(
        self,
        knowledge: Optional[KnowledgeModel],
        selected_file: Optional[str],
        selected_symbol: Optional[str],
        matched_context_dict: Optional[dict],
    ) -> Dict[str, Any]:
        """Assemble dynamic evidence (impact analysis, relationships, debt metrics)."""
        evidence: Dict[str, Any] = {}

        if matched_context_dict and "relationships" in matched_context_dict:
            evidence["relationships"] = matched_context_dict["relationships"]

        if knowledge and (selected_file or selected_symbol):
            target = selected_file or selected_symbol
            try:
                # Perform impact analysis for blast radius calculation
                impact = analyze_impact(knowledge, target)
                affected_files_raw = _get_val(impact, "affected_files", [])
                affected_files = [_get_val(f, "path") for f in affected_files_raw if _get_val(f, "path")]
                risk_score = _get_val(impact, "impact_score", 0)

                evidence["impact_analysis"] = {
                    "target": target,
                    "blast_radius_count": len(affected_files),
                    "impacted_files": affected_files[:10],
                    "risk_score": risk_score,
                }
            except Exception as exc:
                logger.warning(f"Impact analysis error in context engine: {exc}")

        return evidence

    @staticmethod
    def format_grounding_text(payload: RepositoryContextPayload) -> str:
        """
        Format a RepositoryContextPayload into a clean, markdown-grounded text prompt block.
        """
        lines = [
            f"# Repository Context Manifest: {payload.manifest.name}",
            f"- Repository ID: {payload.manifest.repository_id}",
            f"- Directories: {payload.manifest.total_directories if payload.manifest.total_directories is not None else 'Unknown'}",
            f"- Total Files: {payload.manifest.total_files if payload.manifest.total_files is not None else 'Unknown'}",
            f"- Health Score: {payload.manifest.health_score if payload.manifest.health_score is not None else 'N/A'}",
            f"- Detected Stack: {', '.join(payload.manifest.tech_stack) if payload.manifest.tech_stack else 'Unknown'}",
            f"- Key Entry Points: {', '.join(payload.manifest.entry_points) if payload.manifest.entry_points else 'None'}",
            "",
        ]

        if payload.scope.selected_file or payload.scope.selected_symbol:
            lines.append("## Focused Target Scope")
            if payload.scope.selected_file:
                lines.append(f"- Active File: `{payload.scope.selected_file}`")
            if payload.scope.selected_symbol:
                lines.append(f"- Active Symbol: `{payload.scope.selected_symbol}`")
            lines.append("")

        if payload.scope.search_snippets:
            lines.append("## Relevant Search Matches")
            for item in payload.scope.search_snippets:
                item_type = item.get("type", "item")
                name = item.get("name") or item.get("path", "")
                module = item.get("module", "")
                mod_str = f" in `{module}`" if module else ""
                lines.append(f"- [{item_type}] `{name}`{mod_str}")
            lines.append("")

        if payload.evidence:
            lines.append("## Structural Evidence")
            if "impact_analysis" in payload.evidence:
                ia = payload.evidence["impact_analysis"]
                lines.append(
                    f"- Blast Radius for `{ia.get('target')}`: "
                    f"{ia.get('blast_radius_count', 0)} impacted node(s) (Risk Score: {ia.get('risk_score')}/100)"
                )
            if "relationships" in payload.evidence:
                lines.append(f"- Graph Relationships Extracted: {len(payload.evidence['relationships'])} node(s)")
            lines.append("")

        return "\n".join(lines)


# Global instance of RepositoryContextEngine for convenience
global_context_engine = RepositoryContextEngine()

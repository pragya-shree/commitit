"""
Reusable Impact Analysis Engine (ImpactAnalysisService).

Provides a single source of truth for repository dependency analysis:
- Graph building & caching per KnowledgeModel
- Direct and indirect downstream dependent discovery
- Representative dependency chain tracing
- Multi-factor non-hardcoded Impact Score calculation
- Explainability factor generation for UI and AI Assistant
- Semantic node and folder state classifications
"""

from collections import deque
from pathlib import Path

from app.core.logging import get_logger
from app.models.impact import (
    AffectedFile,
    AffectedSymbol,
    DependencyChain,
    ExplainabilityFactor,
    GraphNodeImpactState,
    ImpactAnalysisResult,
    ImpactMetrics,
    SemanticNodeState,
    TargetInfo,
)
from app.models.knowledge import KnowledgeModel

logger = get_logger(__name__)

# Entry point file name heuristics (common web/API/CLI entry points)
ENTRY_POINT_KEYWORDS = {"route", "routes", "main", "app", "api", "server", "cli", "index", "handler", "controller"}


def _clean_repo_path(path_str: str | None) -> str:
    """Strip repository storage root prefixes to produce clean repository-relative paths."""
    if not path_str:
        return ""
    norm = path_str.replace("\\", "/").strip("/")
    parts = norm.split("/")
    for idx, part in enumerate(parts):
        if part.startswith("cmt_") and idx + 1 < len(parts):
            return "/".join(parts[idx + 1 :])
    return norm


class _GraphIndex:
    """Fast, in-memory dependency graph index cached per KnowledgeModel."""

    def __init__(self, model: KnowledgeModel):
        self.repository_id = model.repository_id
        self.nodes: dict[str, dict] = {node.id: node.model_dump() for node in model.nodes}
        self.all_files: set[str] = set()

        # Build file set from scanner tree & parsed modules
        self._collect_files(model.tree)
        for mod in model.modules:
            if mod.path:
                self.all_files.add(_clean_repo_path(mod.path))

        # Adjacency maps:
        # forward_adj[source] -> targets it depends on (source imports/calls target)
        # reverse_adj[target] -> sources that depend on target (source imports/calls target)
        self.forward_adj: dict[str, set[str]] = {node_id: set() for node_id in self.nodes}
        self.reverse_adj: dict[str, set[str]] = {node_id: set() for node_id in self.nodes}

        # Symbol <-> file maps
        self.symbol_to_file: dict[str, str] = {}
        self.file_to_symbols: dict[str, set[str]] = {}

        # Associate modules and internal symbols with files
        for mod in model.modules:
            file_path = _clean_repo_path(mod.path)
            if not file_path:
                continue
            self.all_files.add(file_path)

            module_name = self._module_name(file_path)
            mod_id = f"module:{module_name}"
            self._link_symbol_to_file(mod_id, file_path)

            for cls in mod.classes:
                cls_name = cls.name if hasattr(cls, "name") else cls["name"]
                cls_methods = cls.methods if hasattr(cls, "methods") else cls["methods"]
                class_id = f"class:{module_name}.{cls_name}"
                self._link_symbol_to_file(class_id, file_path)
                for m in cls_methods:
                    m_name = m.name if hasattr(m, "name") else m["name"]
                    method_id = f"function:{module_name}.{cls_name}.{m_name}"
                    self._link_symbol_to_file(method_id, file_path)

            for func in mod.functions:
                func_name = func.name if hasattr(func, "name") else func["name"]
                func_id = f"function:{module_name}.{func_name}"
                self._link_symbol_to_file(func_id, file_path)

        # Populate graph edges
        for edge in model.edges:
            src = edge.source
            tgt = edge.target

            if src not in self.nodes:
                self.nodes[src] = {"id": src, "type": "symbol", "name": src}
            if tgt not in self.nodes:
                self.nodes[tgt] = {"id": tgt, "type": "symbol", "name": tgt}

            self.forward_adj.setdefault(src, set()).add(tgt)
            self.reverse_adj.setdefault(tgt, set()).add(src)

            # Infer file mapping for symbols if missing
            if src not in self.symbol_to_file:
                inferred_file = self._infer_file_from_symbol_id(src)
                if inferred_file:
                    self._link_symbol_to_file(src, inferred_file)

            if tgt not in self.symbol_to_file:
                inferred_file = self._infer_file_from_symbol_id(tgt)
                if inferred_file:
                    self._link_symbol_to_file(tgt, inferred_file)

        # Identify application entry points
        self.entry_point_files: set[str] = set()
        for f in self.all_files:
            stem = Path(f).stem.lower()
            if stem in ENTRY_POINT_KEYWORDS or any(k in stem for k in ["route", "main", "app"]):
                self.entry_point_files.add(f)

    def _collect_files(self, tree_node) -> None:
        node_type = getattr(tree_node, "type", tree_node.get("type") if isinstance(tree_node, dict) else None)
        node_name = getattr(tree_node, "name", tree_node.get("name") if isinstance(tree_node, dict) else None)
        node_path = getattr(tree_node, "path", tree_node.get("path") if isinstance(tree_node, dict) else node_name)
        node_children = getattr(tree_node, "children", tree_node.get("children") if isinstance(tree_node, dict) else None)

        if node_type == "file" and node_path:
            self.all_files.add(_clean_repo_path(node_path))
        if node_children:
            for child in node_children:
                self._collect_files(child)

    def _link_symbol_to_file(self, symbol_id: str, file_path: str) -> None:
        norm_path = _clean_repo_path(file_path)
        self.symbol_to_file[symbol_id] = norm_path
        self.file_to_symbols.setdefault(norm_path, set()).add(symbol_id)

    @staticmethod
    def _module_name(relative_path: str) -> str:
        path = Path(relative_path)
        without_suffix = path.with_suffix("") if path.suffix in {".py", ".ts", ".js", ".jsx", ".tsx"} else path
        return ".".join(without_suffix.parts)

    def _infer_file_from_symbol_id(self, symbol_id: str) -> str | None:
        raw = symbol_id.split(":", 1)[-1]
        parts = raw.split(".")
        for i in range(len(parts), 0, -1):
            sub_path = "/".join(parts[:i])
            for f in self.all_files:
                f_norm = f.replace("\\", "/")
                f_no_ext = str(Path(f_norm).with_suffix(""))
                if f_norm == sub_path or f_norm.endswith("/" + sub_path) or f_no_ext == sub_path or f_no_ext.endswith("/" + sub_path):
                    return f
        return None


# Global in-memory cache for graph indices
_GRAPH_INDEX_CACHE: dict[tuple, _GraphIndex] = {}


def _get_graph_index(model: KnowledgeModel) -> _GraphIndex:
    created_at_str = model.created_at.isoformat() if hasattr(model.created_at, "isoformat") else str(model.created_at)
    cache_key = (model.repository_id, len(model.nodes), len(model.edges), created_at_str)

    if cache_key in _GRAPH_INDEX_CACHE:
        return _GRAPH_INDEX_CACHE[cache_key]

    index = _GraphIndex(model)
    _GRAPH_INDEX_CACHE[cache_key] = index
    return index


def analyze_impact(model: KnowledgeModel, target_query: str) -> ImpactAnalysisResult:
    """
    Perform reusable, deterministic impact analysis for a given target node
    (folder path, file path, or symbol ID) on the cached KnowledgeModel.
    """
    graph = _get_graph_index(model)

    target_info, target_symbols, target_files = _resolve_target(graph, target_query, model)

    # If target is completely unknown or empty, return informative zero-impact result
    if not target_files and not target_symbols and target_query.lower() != "root":
        return _build_empty_impact_result(target_query)

    # Execute Reverse Traversal (discovering dependent symbols and files)
    # distance_map: symbol_id -> shortest hop count from any target symbol
    # parent_map: symbol_id -> predecessor symbol_id along shortest path
    distance_map: dict[str, int] = {}
    parent_map: dict[str, str] = {}
    queue = deque()

    for ts in target_symbols:
        distance_map[ts] = 0
        queue.append(ts)

    expanded_files: set[str] = set()

    while queue:
        curr = queue.popleft()
        curr_dist = distance_map[curr]

        # File-level expansion: if symbol belongs to a file, expand all other symbols in that file at same distance
        curr_file = graph.symbol_to_file.get(curr)
        if curr_file and curr_file not in expanded_files:
            expanded_files.add(curr_file)
            for file_sym in graph.file_to_symbols.get(curr_file, set()):
                if file_sym not in distance_map:
                    distance_map[file_sym] = curr_dist
                    queue.append(file_sym)

        # Reverse graph: sources that import/call `curr`
        for predecessor in graph.reverse_adj.get(curr, set()):
            if predecessor not in distance_map:
                distance_map[predecessor] = curr_dist + 1
                parent_map[predecessor] = curr
                queue.append(predecessor)

    # Classify affected symbols
    affected_symbols: list[AffectedSymbol] = []
    symbol_impact_map: dict[str, str] = {}

    for sym_id, dist in distance_map.items():
        if sym_id in target_symbols:
            symbol_impact_map[sym_id] = "selected"
            continue

        impact_type = "direct" if dist == 1 else "indirect"
        symbol_impact_map[sym_id] = impact_type
        file_p = graph.symbol_to_file.get(sym_id, "")
        node_info = graph.nodes.get(sym_id, {})

        affected_symbols.append(
            AffectedSymbol(
                id=sym_id,
                name=node_info.get("name", sym_id.rsplit(".", 1)[-1]),
                type=node_info.get("type", "symbol"),
                file_path=file_p,
                impact_type=impact_type,
            )
        )

    # Classify affected files
    affected_files_map: dict[str, str] = {}  # file_path -> "selected" | "direct" | "indirect"

    for f in graph.all_files:
        if f in target_files:
            affected_files_map[f] = "selected"

    for sym_id, dist in distance_map.items():
        f = graph.symbol_to_file.get(sym_id)
        if not f or f in target_files:
            continue

        existing_status = affected_files_map.get(f)
        if dist == 1:
            affected_files_map[f] = "direct"
        elif dist > 1 and existing_status != "direct":
            affected_files_map[f] = "indirect"

    # Separate affected files list into direct / indirect lists
    affected_files_list: list[AffectedFile] = []
    direct_files: set[str] = set()
    indirect_files: set[str] = set()

    for f, st in affected_files_map.items():
        if st == "selected":
            continue
        sym_count = len(graph.file_to_symbols.get(f, set()))
        if st == "direct":
            direct_files.add(f)
            affected_files_list.append(AffectedFile(path=f, impact_type="direct", symbol_count=sym_count))
        elif st == "indirect":
            indirect_files.add(f)
            affected_files_list.append(AffectedFile(path=f, impact_type="indirect", symbol_count=sym_count))

    # Calculate dependency depth
    max_depth = max([dist for sym_id, dist in distance_map.items() if sym_id not in target_symbols], default=0)

    # Calculate Fan-in and Fan-out
    fan_in = 0
    fan_out = 0
    for ts in target_symbols:
        fan_in += len([src for src in graph.reverse_adj.get(ts, set()) if src not in target_symbols])
        fan_out += len([tgt for tgt in graph.forward_adj.get(ts, set()) if tgt not in target_symbols])

    # Count entry points affected
    affected_entry_points = [f for f in (direct_files | indirect_files) if f in graph.entry_point_files]
    entry_point_count = len(affected_entry_points)

    # Centrality calculation
    total_repo_files = max(1, len(graph.all_files))
    affected_files_count = len(direct_files) + len(indirect_files)
    centrality_score = round(min(1.0, (fan_in + affected_files_count) / (total_repo_files * 1.5)), 3)

    # Reconstruct representative dependency chains
    dependency_chains = _build_representative_chains(graph, target_symbols, distance_map, parent_map)

    # Compute Multi-factor Impact Score (0–100)
    scope_score = min(1.0, affected_files_count / max(1, total_repo_files)) * 40.0
    direct_score = min(1.0, len(direct_files) / 5.0) * 15.0
    depth_score = min(1.0, max_depth / 5.0) * 15.0
    fan_in_score = min(1.0, fan_in / 10.0) * 10.0

    # Count converging modules/folders
    converging_folders = {f.split("/")[0] for f in (direct_files | indirect_files) if "/" in f}
    convergence_score = min(1.0, len(converging_folders) / 4.0) * 10.0
    entry_score = min(1.0, entry_point_count / 2.0) * 10.0

    raw_impact_score = scope_score + direct_score + depth_score + fan_in_score + convergence_score + entry_score
    impact_score = round(min(100.0, max(0.0, raw_impact_score)), 1)

    # Criticality Classification
    if impact_score <= 25.0:
        criticality = "LOW"
    elif impact_score <= 50.0:
        criticality = "MEDIUM"
    elif impact_score <= 75.0:
        criticality = "HIGH"
    else:
        criticality = "CRITICAL"

    # Metrics Object
    metrics = ImpactMetrics(
        total_dependents=affected_files_count,
        direct_dependents_count=len(direct_files),
        indirect_dependents_count=len(indirect_files),
        dependency_depth=max_depth,
        fan_in=fan_in,
        fan_out=fan_out,
        centrality_score=centrality_score,
        entry_point_count=entry_point_count,
        affected_files_count=affected_files_count,
    )

    # Explainability Factors & Reasons
    explainability, reasons = _generate_explainability(
        target_info=target_info,
        metrics=metrics,
        affected_files_count=affected_files_count,
        direct_files=direct_files,
        indirect_files=indirect_files,
        max_depth=max_depth,
        fan_in=fan_in,
        converging_folders=converging_folders,
        entry_point_count=entry_point_count,
        affected_entry_points=affected_entry_points,
    )

    # Semantic Node & Folder States for UI Graph Integration
    graph_states, folder_states = _generate_semantic_states(model, graph, target_files, direct_files, indirect_files)

    return ImpactAnalysisResult(
        target=target_info,
        impact_score=impact_score,
        criticality=criticality,
        metrics=metrics,
        explainability=explainability,
        reasons=reasons,
        dependency_chains=dependency_chains,
        affected_files=affected_files_list,
        affected_symbols=affected_symbols,
        graph_states=graph_states,
        folder_states=folder_states,
    )


def _resolve_target(graph: _GraphIndex, query: str, model: KnowledgeModel) -> tuple[TargetInfo, set[str], set[str]]:
    """Resolve query string into TargetInfo, target symbols set, and target files set."""
    q_norm = query.strip().replace("\\", "/").rstrip("/")

    # Check if query matches a symbol ID
    if q_norm in graph.nodes:
        sym_file = graph.symbol_to_file.get(q_norm)
        target_files = {sym_file} if sym_file else set()
        info = TargetInfo(id=q_norm, name=graph.nodes[q_norm].get("name", q_norm), type="symbol", path=sym_file)
        return info, {q_norm}, target_files

    # Check if query matches a specific file path
    file_matches = [f for f in graph.all_files if f.replace("\\", "/") == q_norm or f.endswith(f"/{q_norm}")]
    if file_matches:
        matched_file = file_matches[0]
        syms = graph.file_to_symbols.get(matched_file, set())
        # If no explicit symbol associated, generate virtual module symbol ID
        if not syms:
            mod_id = f"module:{graph._module_name(matched_file)}"
            syms = {mod_id}
        info = TargetInfo(id=matched_file, name=Path(matched_file).name, type="file", path=matched_file)
        return info, syms, {matched_file}

    # Check if query matches a directory / folder path
    dir_files = {f for f in graph.all_files if f.startswith(f"{q_norm}/") or f.split("/")[0] == q_norm}
    if dir_files:
        all_dir_syms = set()
        for f in dir_files:
            all_dir_syms.update(graph.file_to_symbols.get(f, set()))
            mod_id = f"module:{graph._module_name(f)}"
            all_dir_syms.add(mod_id)

        info = TargetInfo(id=q_norm, name=q_norm, type="folder", path=q_norm)
        return info, all_dir_syms, dir_files

    # Fallback to root or default top-level folder match
    if q_norm.lower() == "root":
        info = TargetInfo(id="root", name=model.repository.name, type="folder", path="")
        all_syms = set(graph.nodes.keys())
        return info, all_syms, set(graph.all_files)

    # Unknown query target fallback
    info = TargetInfo(id=query, name=query, type="file", path=query)
    return info, set(), set()


def _build_representative_chains(
    graph: _GraphIndex,
    target_symbols: set[str],
    distance_map: dict[str, int],
    parent_map: dict[str, str],
) -> list[DependencyChain]:
    """Extract up to 5 representative dependency chains explaining propagation paths."""
    chains: list[DependencyChain] = []
    # Pick nodes with highest distances (deepest callers) to trace back to target
    deep_nodes = sorted(
        [s for s in distance_map if s not in target_symbols],
        key=lambda s: distance_map[s],
        reverse=True,
    )[:5]

    for start_node in deep_nodes:
        path_syms = [start_node]
        curr = start_node
        while curr in parent_map and curr not in target_symbols:
            curr = parent_map[curr]
            path_syms.append(curr)

        # Convert symbol path to formatted file path chain
        path_files = []
        for s in path_syms:
            f = graph.symbol_to_file.get(s, s.split(":", 1)[-1])
            if not path_files or path_files[-1] != f:
                path_files.append(f)

        formatted_chain = " ➔ ".join(path_files)
        chains.append(
            DependencyChain(
                target_id=path_syms[-1],
                dependent_id=start_node,
                steps=path_files,
                formatted=formatted_chain,
            )
        )

    return chains


def _generate_explainability(
    target_info: TargetInfo,
    metrics: ImpactMetrics,
    affected_files_count: int,
    direct_files: set[str],
    indirect_files: set[str],
    max_depth: int,
    fan_in: int,
    converging_folders: set[str],
    entry_point_count: int,
    affected_entry_points: list[str],
) -> tuple[list[ExplainabilityFactor], list[str]]:
    """Generate structured explainability factors and plain bullet text for UI & AI Assistant."""
    factors: list[ExplainabilityFactor] = []
    reasons: list[str] = []

    # 1. Dependents Factor
    if affected_files_count > 0:
        factors.append(
            ExplainabilityFactor(
                category="Dependents",
                title="Downstream Blast Radius",
                description=f"Changes directly affect {len(direct_files)} file(s) and transitively impact {len(indirect_files)} indirect file(s).",
                impact_level="high" if affected_files_count > 3 else "positive",
            )
        )
        reasons.append(f"Used by {affected_files_count} downstream file(s) ({len(direct_files)} direct, {len(indirect_files)} indirect).")
    else:
        factors.append(
            ExplainabilityFactor(
                category="Dependents",
                title="Isolated Component",
                description="No downstream dependent files detected. Modifying this component has isolated local impact.",
                impact_level="neutral",
            )
        )
        reasons.append("No downstream files depend on this component (0 direct, 0 indirect).")

    # 2. Dependency Depth
    if max_depth > 0:
        factors.append(
            ExplainabilityFactor(
                category="Depth",
                title="Transitive Propagation Depth",
                description=f"Maximum dependency chain depth reaches {max_depth} hop(s) across the repository graph.",
                impact_level="warning" if max_depth >= 3 else "positive",
            )
        )
        reasons.append(f"Transitive dependency depth: {max_depth} level(s).")

    # 3. Fan-in / Fan-out Centrality
    factors.append(
        ExplainabilityFactor(
            category="Centrality",
            title="In-degree Symbol Convergence (Fan-in)",
            description=f"{fan_in} direct symbol call/import reference(s) target this node.",
            impact_level="high" if fan_in > 5 else "positive",
        )
    )
    reasons.append(f"In-degree references (Fan-in): {fan_in} incoming edge(s).")

    # 4. Entry Point Importance
    if entry_point_count > 0:
        entry_names = ", ".join(Path(f).name for f in affected_entry_points[:3])
        factors.append(
            ExplainabilityFactor(
                category="Entry Point",
                title="Critical Entry Point Dependents",
                description=f"Directly or transitively referenced by {entry_point_count} application entry point(s) ({entry_names}).",
                impact_level="high",
            )
        )
        reasons.append(f"Crucial component powering {entry_point_count} entry point(s) ({entry_names}).")

    # 5. Module Convergence
    if len(converging_folders) > 1:
        folders_str = ", ".join(sorted(converging_folders))
        factors.append(
            ExplainabilityFactor(
                category="Convergence",
                title="Multi-Module Convergence",
                description=f"Multiple top-level modules ({folders_str}) converge on this component.",
                impact_level="high",
            )
        )
        reasons.append(f"Architectural hub: {len(converging_folders)} distinct top-level module(s) depend on it ({folders_str}).")

    return factors, reasons


def _generate_semantic_states(
    model: KnowledgeModel,
    graph: _GraphIndex,
    target_files: set[str],
    direct_files: set[str],
    indirect_files: set[str],
) -> tuple[list[GraphNodeImpactState], dict[str, SemanticNodeState]]:
    """Map semantic states ('selected', 'direct', 'indirect', 'unaffected') to symbol & folder nodes."""
    graph_states: list[GraphNodeImpactState] = []
    folder_states: dict[str, SemanticNodeState] = {}

    # Symbol-level node states
    for node in model.nodes:
        sym_id = node.id
        sym_file = graph.symbol_to_file.get(sym_id, "")
        if sym_file in target_files or sym_id in target_files:
            state: SemanticNodeState = "selected"
        elif sym_file in direct_files:
            state = "direct"
        elif sym_file in indirect_files:
            state = "indirect"
        else:
            state = "unaffected"

        graph_states.append(GraphNodeImpactState(node_id=sym_id, state=state, node_type=node.type))

    # Top-level folder semantic states for Repository Universe graph visual integration
    top_directories = [c.name for c in (model.tree.children or []) if c.type == "directory"]

    for folder in top_directories:
        folder_files = {f for f in graph.all_files if f.startswith(f"{folder}/") or f.split("/")[0] == folder}

        if folder_files and folder_files.issubset(target_files):
            folder_states[folder] = "selected"
        elif any(f in target_files for f in folder_files):
            folder_states[folder] = "selected"
        elif any(f in direct_files for f in folder_files):
            folder_states[folder] = "direct"
        elif any(f in indirect_files for f in folder_files):
            folder_states[folder] = "indirect"
        else:
            folder_states[folder] = "unaffected"

    return graph_states, folder_states


def _build_empty_impact_result(target_query: str) -> ImpactAnalysisResult:
    """Fallback result for empty target queries."""
    target_info = TargetInfo(id=target_query, name=target_query, type="file", path=target_query)
    metrics = ImpactMetrics(
        total_dependents=0,
        direct_dependents_count=0,
        indirect_dependents_count=0,
        dependency_depth=0,
        fan_in=0,
        fan_out=0,
        centrality_score=0.0,
        entry_point_count=0,
        affected_files_count=0,
    )
    explainability = [
        ExplainabilityFactor(
            category="Dependents",
            title="No Dependents Found",
            description="This component has no recorded downstream dependents in the repository graph.",
            impact_level="neutral",
        )
    ]
    reasons = ["No downstream files or symbols depend on this component."]

    return ImpactAnalysisResult(
        target=target_info,
        impact_score=0.0,
        criticality="LOW",
        metrics=metrics,
        explainability=explainability,
        reasons=reasons,
        dependency_chains=[],
        affected_files=[],
        affected_symbols=[],
        graph_states=[],
        folder_states={},
    )

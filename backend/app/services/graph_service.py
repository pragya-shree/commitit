"""
Dependency graph engine.

Builds a deterministic graph of modules, classes, and functions, linked
by "imports", "inherits", and "calls" relationships. Reuses
parser_service's output for imports and class definitions instead of
re-walking the repository, and only re-reads each already-identified
Python file once more to extract call expressions (which the parser's
per-file metadata doesn't capture).

Everything here is static AST analysis — no AI, no guessing. Call and
inheritance targets that can't be matched to a definition found elsewhere
in the repository are still recorded as best-effort external nodes, since
perfect resolution (e.g. across aliases or dynamic dispatch) isn't
possible with AST alone.
"""

import ast
import time
from pathlib import Path

from app.core.logging import get_logger
from app.services.parser_service import parse_repository

logger = get_logger(__name__)


def _module_name(relative_path: str) -> str:
    """Convert a relative file path like 'app/services/git.py' to 'app.services.git'."""
    path = Path(relative_path)
    without_suffix = path.with_suffix("") if path.suffix == ".py" else path
    return ".".join(without_suffix.parts)


def _short_name(dotted: str) -> str:
    """Return the last component of a dotted name, e.g. 'click.UsageError' -> 'UsageError'."""
    return dotted.rsplit(".", 1)[-1]


class _GraphBuilder:
    """Accumulates deduplicated nodes and edges while the graph is built."""

    def __init__(self):
        self.nodes: dict[str, dict] = {}
        self.edges: list[dict] = []
        self._edge_keys: set[tuple] = set()

    def add_node(self, node_id: str, node_type: str, name: str) -> None:
        if node_id not in self.nodes:
            self.nodes[node_id] = {"id": node_id, "type": node_type, "name": name}

    def add_edge(self, source: str, target: str, relationship: str) -> None:
        key = (source, target, relationship)
        if key not in self._edge_keys:
            self._edge_keys.add(key)
            self.edges.append({"source": source, "target": target, "relationship": relationship})


def _add_call_edges(func_node: ast.AST, caller_id: str, function_lookup: dict, graph: _GraphBuilder) -> None:
    """Best-effort: find ast.Call expressions inside a function/method body."""
    for sub in ast.walk(func_node):
        if not isinstance(sub, ast.Call):
            continue
        try:
            callee_expr = ast.unparse(sub.func)
        except Exception:  # pragma: no cover - defensive, unparse rarely fails
            continue

        callee_short = _short_name(callee_expr)
        if callee_short in function_lookup:
            target_id = function_lookup[callee_short]
        else:
            target_id = f"function:{callee_expr}"
            graph.add_node(target_id, "function", callee_expr)

        graph.add_edge(caller_id, target_id, "calls")


def build_dependency_graph(local_path: Path) -> dict:
    """
    Build a deterministic dependency graph for the repository at local_path.

    Reuses parser_service.parse_repository for module/import/class/function
    metadata, then makes one additional pass over the same files to extract
    best-effort function call edges.
    """
    parsed = parse_repository(local_path)
    return build_dependency_graph_from_parsed(local_path, parsed)


def build_dependency_graph_from_parsed(local_path: Path, parsed: dict) -> dict:
    """
    Same as build_dependency_graph, but reuses an already-computed parse
    result (as returned by parser_service.parse_repository) instead of
    parsing the repository again. Used by knowledge_service, which needs
    both the parse result and the graph and shouldn't parse twice.
    """
    start_time = time.time()
    logger.info("Graph generation started: %s", local_path)

    modules = parsed["modules"]

    graph = _GraphBuilder()
    class_lookup: dict[str, str] = {}
    function_lookup: dict[str, str] = {}

    # Pass 1: register module/class/function nodes and import edges.
    for module in modules:
        module_name = _module_name(module["path"])
        module_id = f"module:{module_name}"
        graph.add_node(module_id, "module", module_name)

        for imported in module["imports"]:
            target_id = f"module:{imported}"
            graph.add_node(target_id, "module", imported)
            graph.add_edge(module_id, target_id, "imports")

        for cls in module["classes"]:
            class_id = f"class:{module_name}.{cls['name']}"
            graph.add_node(class_id, "class", cls["name"])
            class_lookup.setdefault(cls["name"], class_id)

            for method in cls["methods"]:
                method_id = f"function:{module_name}.{cls['name']}.{method['name']}"
                graph.add_node(method_id, "function", method["name"])
                function_lookup.setdefault(method["name"], method_id)

        for func in module["functions"]:
            func_id = f"function:{module_name}.{func['name']}"
            graph.add_node(func_id, "function", func["name"])
            function_lookup.setdefault(func["name"], func_id)

    # Pass 2: inheritance edges. Separate pass so class_lookup is fully populated
    # before resolving base classes that may be defined in another file.
    for module in modules:
        module_name = _module_name(module["path"])
        for cls in module["classes"]:
            class_id = f"class:{module_name}.{cls['name']}"
            for base in cls["bases"]:
                base_short = _short_name(base)
                if base_short in class_lookup:
                    target_id = class_lookup[base_short]
                else:
                    target_id = f"class:{base}"
                    graph.add_node(target_id, "class", base)
                graph.add_edge(class_id, target_id, "inherits")

    # Pass 3: call edges. Re-reads each already-identified file once more to
    # inspect function/method bodies (parser_service doesn't capture call
    # expressions, only signatures) — no repeat directory traversal.
    for module in modules:
        module_name = _module_name(module["path"])
        file_path = local_path / module["path"]
        try:
            source = file_path.read_text(encoding="utf-8")
            tree = ast.parse(source, filename=str(file_path))
        except (OSError, UnicodeDecodeError, SyntaxError):
            continue

        for node in tree.body:
            if isinstance(node, ast.ClassDef):
                for item in node.body:
                    if isinstance(item, (ast.FunctionDef, ast.AsyncFunctionDef)):
                        caller_id = f"function:{module_name}.{node.name}.{item.name}"
                        _add_call_edges(item, caller_id, function_lookup, graph)
            elif isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
                caller_id = f"function:{module_name}.{node.name}"
                _add_call_edges(node, caller_id, function_lookup, graph)

    duration_ms = round((time.time() - start_time) * 1000, 2)
    logger.info(
        "Graph generation completed: %s nodes, %s edges, %sms",
        len(graph.nodes),
        len(graph.edges),
        duration_ms,
    )

    return {
        "total_nodes": len(graph.nodes),
        "total_edges": len(graph.edges),
        "nodes": list(graph.nodes.values()),
        "edges": graph.edges,
    }

"""
Semantic Repository Query Engine.

Every function here takes an already-built KnowledgeModel and returns
plain dicts describing matches. Nothing in this module touches the
filesystem, the scanner, the parser, or the graph builder — it only reads
data that's already in memory. This keeps queries fast and guarantees
they never trigger a rebuild.
"""

from app.models.knowledge import KnowledgeModel
from app.models.repository import TreeNode


def _flatten_tree(tree: TreeNode) -> list[str]:
    """Flatten the cached project tree into a list of file paths (no filesystem access)."""
    paths: list[str] = []

    def _walk(node: TreeNode, prefix: str) -> None:
        current = f"{prefix}/{node.name}" if prefix else node.name
        if node.type == "file":
            paths.append(current)
            return
        for child in node.children or []:
            _walk(child, current)

    for child in tree.children or []:
        _walk(child, "")

    return paths


def list_classes(model: KnowledgeModel, name: str | None = None) -> list[dict]:
    """List classes across all modules, optionally filtered by a case-insensitive substring."""
    needle = name.lower() if name else None
    results = []
    for module in model.modules:
        for cls in module.classes:
            if needle and needle not in cls.name.lower():
                continue
            results.append(
                {
                    "name": cls.name,
                    "module": module.path,
                    "bases": cls.bases,
                    "docstring": cls.docstring,
                    "methods": [method.name for method in cls.methods],
                }
            )
    return results


def list_functions(model: KnowledgeModel, name: str | None = None) -> list[dict]:
    """List top-level functions and class methods, optionally filtered by substring."""
    needle = name.lower() if name else None
    results = []
    for module in model.modules:
        for func in module.functions:
            if needle and needle not in func.name.lower():
                continue
            results.append(
                {
                    "name": func.name,
                    "module": module.path,
                    "qualified_name": f"{module.path}::{func.name}",
                    "args": func.args,
                    "returns": func.returns,
                    "docstring": func.docstring,
                }
            )
        for cls in module.classes:
            for method in cls.methods:
                if needle and needle not in method.name.lower():
                    continue
                results.append(
                    {
                        "name": method.name,
                        "module": module.path,
                        "qualified_name": f"{module.path}::{cls.name}.{method.name}",
                        "args": method.args,
                        "returns": method.returns,
                        "docstring": method.docstring,
                    }
                )
    return results


def list_imports(model: KnowledgeModel, name: str | None = None) -> list[dict]:
    """List import edges (importing module -> imported name), optionally filtered."""
    needle = name.lower() if name else None
    results = []
    for module in model.modules:
        for imported in module.imports:
            if needle and needle not in imported.lower():
                continue
            results.append({"module": module.path, "imported": imported})
    return results


def list_files(model: KnowledgeModel, name: str | None = None) -> list[dict]:
    """List file paths from the cached project tree, optionally filtered by substring."""
    needle = name.lower() if name else None
    paths = _flatten_tree(model.tree)
    if needle:
        paths = [p for p in paths if needle in p.lower()]
    return [{"path": p} for p in paths]


def list_symbols(model: KnowledgeModel, name: str | None = None) -> list[dict]:
    """List classes and functions/methods together as generic 'symbols'."""
    results = []
    for cls in list_classes(model, name):
        results.append(
            {
                "name": cls["name"],
                "type": "class",
                "module": cls["module"],
                "qualified_name": f"{cls['module']}::{cls['name']}",
                "docstring": cls["docstring"],
            }
        )
    for func in list_functions(model, name):
        results.append(
            {
                "name": func["name"],
                "type": "function",
                "module": func["module"],
                "qualified_name": func["qualified_name"],
                "docstring": func["docstring"],
            }
        )
    return results


def get_relationships(model: KnowledgeModel, symbol: str) -> dict:
    """
    Resolve a symbol name to matching graph nodes, then return every edge
    where a matched node is the source (outgoing) or target (incoming).

    Prefers exact (case-insensitive) name matches; falls back to substring
    matches if there's no exact match.
    """
    needle = symbol.lower()
    exact_matches = [node for node in model.nodes if node.name.lower() == needle]
    matches = exact_matches or [node for node in model.nodes if needle in node.name.lower()]
    matched_ids = {node.id for node in matches}

    outgoing = [edge for edge in model.edges if edge.source in matched_ids]
    incoming = [edge for edge in model.edges if edge.target in matched_ids]

    return {
        "symbol": symbol,
        "matched_node_ids": sorted(matched_ids),
        "outgoing": outgoing,
        "incoming": incoming,
    }


def search(model: KnowledgeModel, query: str) -> dict:
    """Aggregate search across repository metadata, files, classes, functions, and imports."""
    needle = query.lower()
    repo = model.repository
    repository_match = needle in repo.owner.lower() or needle in repo.name.lower() or (
        bool(repo.branch) and needle in repo.branch.lower()
    )

    return {
        "query": query,
        "repository_match": repository_match,
        "files": list_files(model, query),
        "classes": list_classes(model, query),
        "functions": list_functions(model, query),
        "imports": list_imports(model, query),
    }

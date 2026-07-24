"""
Python code parser service.

Uses only Python's built-in `ast` module to extract structured metadata
from every .py file in a cloned repository: imports, classes, functions,
methods, decorators, docstrings, arguments, and return annotations.

This is static, deterministic analysis only — no AI, no Tree-sitter, and
no natural-language output. Directory walking and ignore rules are reused
from scanner_service to avoid duplicating that logic.
"""

import ast
import time
from pathlib import Path

from app.core.logging import get_logger
from app.services.scanner_service import is_hidden, walk_tree

logger = get_logger(__name__)


def _build_arguments(args: ast.arguments) -> list[dict]:
    """Flatten an ast.arguments node into a simple list of {name, annotation}."""
    result = []

    for arg in [*args.posonlyargs, *args.args]:
        result.append(
            {"name": arg.arg, "annotation": ast.unparse(arg.annotation) if arg.annotation else None}
        )
    if args.vararg:
        result.append(
            {
                "name": f"*{args.vararg.arg}",
                "annotation": ast.unparse(args.vararg.annotation) if args.vararg.annotation else None,
            }
        )
    for arg in args.kwonlyargs:
        result.append(
            {"name": arg.arg, "annotation": ast.unparse(arg.annotation) if arg.annotation else None}
        )
    if args.kwarg:
        result.append(
            {
                "name": f"**{args.kwarg.arg}",
                "annotation": ast.unparse(args.kwarg.annotation) if args.kwarg.annotation else None,
            }
        )

    return result


def _build_function(node: ast.FunctionDef | ast.AsyncFunctionDef) -> dict:
    """Extract metadata from a function or method definition."""
    return {
        "name": node.name,
        "args": _build_arguments(node.args),
        "returns": ast.unparse(node.returns) if node.returns else None,
        "decorators": [ast.unparse(dec) for dec in node.decorator_list],
        "docstring": ast.get_docstring(node),
    }


def _build_class(node: ast.ClassDef) -> dict:
    """Extract metadata from a class definition, including its methods."""
    methods = [
        _build_function(item)
        for item in node.body
        if isinstance(item, (ast.FunctionDef, ast.AsyncFunctionDef))
    ]
    return {
        "name": node.name,
        "bases": [ast.unparse(base) for base in node.bases],
        "decorators": [ast.unparse(dec) for dec in node.decorator_list],
        "docstring": ast.get_docstring(node),
        "methods": methods,
    }


def _build_imports(tree: ast.Module) -> list[str]:
    """Collect a flat list of imported names, dotted-path style."""
    imports: list[str] = []
    for node in ast.walk(tree):
        if isinstance(node, ast.Import):
            for alias in node.names:
                imports.append(alias.name)
        elif isinstance(node, ast.ImportFrom):
            prefix = "." * node.level + (node.module or "")
            for alias in node.names:
                imports.append(f"{prefix}.{alias.name}" if prefix else alias.name)
    return imports


def _parse_module(tree: ast.Module, relative_path: Path) -> dict:
    """Extract module-level metadata: docstring, imports, classes, functions."""
    classes = [_build_class(node) for node in tree.body if isinstance(node, ast.ClassDef)]
    functions = [
        _build_function(node)
        for node in tree.body
        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef))
    ]

    return {
        "path": relative_path.as_posix(),
        "docstring": ast.get_docstring(tree),
        "imports": _build_imports(tree),
        "classes": classes,
        "functions": functions,
    }


def parse_repository(local_path: Path) -> dict:
    """
    Walk local_path and parse every Python file with `ast`.

    Returns aggregate counts and a list of per-file structured metadata.
    Files that can't be read or contain a syntax error are skipped and
    logged, without failing the whole parse.
    """
    start_time = time.time()
    logger.info("Parse started: %s", local_path)

    modules = []
    total_classes = 0
    total_functions = 0
    total_imports = 0

    for root, _dirnames, filenames in walk_tree(local_path):
        for filename in filenames:
            if is_hidden(filename) or not filename.endswith(".py"):
                continue

            file_path = root / filename
            try:
                source = file_path.read_text(encoding="utf-8")
            except (OSError, UnicodeDecodeError) as exc:
                logger.warning("Skipping unreadable file %s: %s", file_path, exc)
                continue

            try:
                tree = ast.parse(source, filename=str(file_path))
            except SyntaxError as exc:
                logger.warning("Skipping file with syntax error %s: %s", file_path, exc)
                continue

            module = _parse_module(tree, file_path.relative_to(local_path))
            modules.append(module)

            total_classes += len(module["classes"])
            total_functions += len(module["functions"]) + sum(
                len(cls["methods"]) for cls in module["classes"]
            )
            total_imports += len(module["imports"])

    duration_ms = round((time.time() - start_time) * 1000, 2)
    logger.info(
        "Parse completed: %s (%s files, %sms)", local_path, len(modules), duration_ms
    )

    return {
        "total_files": len(modules),
        "total_classes": total_classes,
        "total_functions": total_functions,
        "total_imports": total_imports,
        "modules": modules,
    }

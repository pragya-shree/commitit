"""
Repository Knowledge Model service.

Builds the single unified representation of an analyzed repository —
metadata, scan results, parsed Python source, and dependency graph — by
calling the existing scanner, parser, and graph services exactly once,
then caches it in memory keyed by repository_id. Later requests for the
same repository retrieve the cached model instead of re-running analysis.

This service only manages the Knowledge Model's lifecycle (build, store,
retrieve). It doesn't re-implement scanning, parsing, or graph-building.
"""

import threading
import time
from datetime import datetime, timezone
from pathlib import Path

from app.core.logging import get_logger
from app.models.knowledge import KnowledgeModel
from app.services.graph_service import build_dependency_graph_from_parsed
from app.services.parser_service import parse_repository
from app.services.repository_store import get_metadata
from app.services.scanner_service import scan_repository

logger = get_logger(__name__)

_STORE: dict[str, KnowledgeModel] = {}
_LOCK = threading.Lock()


class KnowledgeNotBuiltError(Exception):
    """Raised when a repository_id has no cached Knowledge Model yet."""


def _fallback_metadata(local_path: Path) -> dict:
    """
    Minimal repository metadata for cases where none was registered
    (e.g. a repository registered directly for testing rather than via
    git_service.clone_repository, which always provides real metadata).
    """
    return {
        "owner": "unknown",
        "name": local_path.name,
        "branch": None,
        "files": 0,
        "directories": 0,
        "size": "0.0 KB",
    }


def _approx_size_bytes(model: KnowledgeModel) -> int:
    """Approximate memory footprint via the size of the model's JSON serialization."""
    return len(model.model_dump_json().encode("utf-8"))


def build(repository_id: str, local_path: Path) -> KnowledgeModel:
    """
    Build a fresh Knowledge Model for a repository and store it, replacing
    any previously cached model for the same repository_id.

    Runs the scanner, parser, and dependency graph exactly once each
    (the graph builder reuses the parser's output rather than re-parsing).
    """
    start_time = time.time()
    logger.info("Knowledge Model build started: %s", local_path)

    scan_result = scan_repository(local_path)
    parse_result = parse_repository(local_path)
    graph_result = build_dependency_graph_from_parsed(local_path, parse_result)

    repository_metadata = get_metadata(repository_id) or _fallback_metadata(local_path)

    model = KnowledgeModel(
        repository_id=repository_id,
        created_at=datetime.now(timezone.utc),
        repository=repository_metadata,
        scan_summary={
            "total_files": scan_result["total_files"],
            "total_directories": scan_result["total_directories"],
        },
        languages=scan_result["languages"],
        largest_files=scan_result["largest_files"],
        tree=scan_result["tree"],
        parse_summary={
            "total_files": parse_result["total_files"],
            "total_classes": parse_result["total_classes"],
            "total_functions": parse_result["total_functions"],
            "total_imports": parse_result["total_imports"],
        },
        modules=parse_result["modules"],
        graph_summary={
            "total_nodes": graph_result["total_nodes"],
            "total_edges": graph_result["total_edges"],
        },
        nodes=graph_result["nodes"],
        edges=graph_result["edges"],
    )

    with _LOCK:
        _STORE[repository_id] = model

    duration_ms = round((time.time() - start_time) * 1000, 2)
    logger.info(
        "Knowledge Model build completed: %s | files=%s modules=%s classes=%s "
        "functions=%s graph_nodes=%s graph_edges=%s approx_size=%sKB duration=%sms",
        repository_id,
        scan_result["total_files"],
        parse_result["total_files"],
        parse_result["total_classes"],
        parse_result["total_functions"],
        graph_result["total_nodes"],
        graph_result["total_edges"],
        round(_approx_size_bytes(model) / 1024, 1),
        duration_ms,
    )

    return model


def get_or_build(repository_id: str, local_path: Path) -> KnowledgeModel:
    """Return the cached Knowledge Model for repository_id, building it if absent."""
    with _LOCK:
        cached = _STORE.get(repository_id)
    if cached is not None:
        return cached

    return build(repository_id, local_path)


def get(repository_id: str) -> KnowledgeModel | None:
    """
    Pure read: return the cached Knowledge Model for repository_id, or
    None if it hasn't been built yet. Never builds or touches the
    filesystem — used by the read-only query layer.
    """
    with _LOCK:
        return _STORE.get(repository_id)


def get_required(repository_id: str) -> KnowledgeModel:
    """Same as get(), but raises KnowledgeNotBuiltError instead of returning None."""
    model = get(repository_id)
    if model is None:
        raise KnowledgeNotBuiltError(
            f"No Knowledge Model has been built yet for repository_id: {repository_id}. "
            "Build one first via GET /repository/{repository_id}/knowledge (or /scan, "
            "/parse, /dependencies)."
        )
    return model

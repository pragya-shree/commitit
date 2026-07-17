"""
In-memory repository registry.

Maps a public repository_id to its local clone path on disk (and,
optionally, the repository metadata collected at clone time). This keeps
filesystem paths out of API responses while letting later requests (e.g.
scanning, or building the Knowledge Model) look a repository back up by
ID without recomputing metadata. No database is used — this is a simple
process-lifetime dict, intentionally minimal for now.
"""

import uuid
from pathlib import Path


class UnknownRepositoryIDError(Exception):
    """Raised when a repository_id was never registered."""


class RepositoryPathMissingError(Exception):
    """Raised when a registered repository's local path no longer exists on disk."""


_REGISTRY: dict[str, dict] = {}


def register(local_path: Path, metadata: dict | None = None) -> str:
    """
    Register a local clone path and return its new repository_id.

    metadata (owner/name/branch/files/directories/size, as collected by
    git_service) is stored alongside the path so later steps don't need
    to recompute it. It's optional since not every caller has it on hand.
    """
    repository_id = f"cmt_{uuid.uuid4().hex[:8]}"
    _REGISTRY[repository_id] = {"local_path": str(local_path), "metadata": metadata}
    return repository_id


def resolve(repository_id: str) -> Path:
    """
    Look up the local path for a repository_id.

    Raises UnknownRepositoryIDError if the ID was never registered, or
    RepositoryPathMissingError if it was registered but no longer exists
    on disk (e.g. removed externally).
    """
    entry = _REGISTRY.get(repository_id)
    if entry is None:
        raise UnknownRepositoryIDError(f"Unknown repository_id: {repository_id}")

    path = Path(entry["local_path"])
    if not path.exists():
        raise RepositoryPathMissingError(f"Repository no longer exists on disk: {repository_id}")

    return path


def get_metadata(repository_id: str) -> dict | None:
    """
    Return the repository metadata stored at registration time, or None
    if none was provided. Validates the ID/path the same way resolve() does.
    """
    resolve(repository_id)
    return _REGISTRY[repository_id]["metadata"]

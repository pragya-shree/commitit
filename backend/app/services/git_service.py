"""
Repository ingestion service.

Handles validating GitHub repository URLs, cloning them into a
temporary workspace with GitPython, collecting basic filesystem
metadata, and cleaning up after failures. No source code parsing
happens here — that's for a future milestone.
"""

import re
import shutil
import tempfile
from pathlib import Path

from git import Repo
from git.exc import GitCommandError

from app.core.logging import get_logger
from app.services.repository_store import register

logger = get_logger(__name__)

# Matches https://github.com/<owner>/<repo>(.git)?(/)?
GITHUB_URL_PATTERN = re.compile(
    r"^https://github\.com/(?P<owner>[A-Za-z0-9_.-]+)/(?P<name>[A-Za-z0-9_.-]+?)(\.git)?/?$"
)


class InvalidRepositoryURLError(Exception):
    """Raised when the provided URL is not a valid public GitHub repo URL."""


class RepositoryNotFoundError(Exception):
    """Raised when the repository does not exist or is private/inaccessible."""


class CloneFailedError(Exception):
    """Raised when the clone fails for any other reason (network, git, etc)."""


def parse_github_url(github_url: str) -> tuple[str, str]:
    """Validate a GitHub URL and extract (owner, name). Raises InvalidRepositoryURLError."""
    if not github_url or not github_url.strip():
        raise InvalidRepositoryURLError("GitHub URL must not be empty")

    match = GITHUB_URL_PATTERN.match(github_url.strip())
    if not match:
        raise InvalidRepositoryURLError(f"Not a valid GitHub repository URL: {github_url}")

    return match.group("owner"), match.group("name")


def _collect_metadata(clone_path: Path, owner: str, name: str, repo: Repo) -> dict:
    """Walk the cloned repository on disk and gather basic stats."""
    file_count = 0
    dir_count = 0
    total_bytes = 0

    for path in clone_path.rglob("*"):
        if ".git" in path.parts:
            continue
        if path.is_file():
            file_count += 1
            total_bytes += path.stat().st_size
        elif path.is_dir():
            dir_count += 1

    size = _format_size(total_bytes)

    try:
        branch = repo.active_branch.name
    except (TypeError, ValueError):
        # Detached HEAD or no commits yet.
        branch = None

    return {
        "owner": owner,
        "name": name,
        "branch": branch,
        "files": file_count,
        "directories": dir_count,
        "size": size,
    }


def _format_size(total_bytes: int) -> str:
    """Format a byte count as a human-readable KB/MB string."""
    kb = total_bytes / 1024
    if kb < 1024:
        return f"{kb:.1f} KB"
    return f"{kb / 1024:.1f} MB"


def clone_repository(github_url: str) -> dict:
    """
    Validate, clone, and inspect a public GitHub repository.

    Returns {"repository_id": str, "metadata": dict} on success. Raises
    InvalidRepositoryURLError, RepositoryNotFoundError, or CloneFailedError
    on failure. The temporary clone directory is removed automatically
    whenever cloning fails.
    """
    owner, name = parse_github_url(github_url)

    workspace = Path(tempfile.mkdtemp(prefix="commitit_"))
    clone_path = workspace / name

    logger.info("Clone started: %s/%s -> %s", owner, name, clone_path)

    try:
        repo = Repo.clone_from(github_url, clone_path, depth=1)
    except GitCommandError as exc:
        shutil.rmtree(workspace, ignore_errors=True)
        logger.warning("Clone failed for %s/%s: %s", owner, name, exc)
        logger.info("Cleanup performed for %s", workspace)

        error_text = str(exc).lower()
        if "not found" in error_text or "repository not found" in error_text:
            raise RepositoryNotFoundError(f"Repository not found: {github_url}") from exc
        if "could not read username" in error_text or "authentication failed" in error_text:
            raise RepositoryNotFoundError(
                f"Repository is private or inaccessible: {github_url}"
            ) from exc
        raise CloneFailedError(f"Failed to clone repository: {github_url}") from exc
    except OSError as exc:
        shutil.rmtree(workspace, ignore_errors=True)
        logger.warning("Filesystem error while cloning %s/%s: %s", owner, name, exc)
        logger.info("Cleanup performed for %s", workspace)
        raise CloneFailedError(f"Filesystem error while cloning: {exc}") from exc

    logger.info("Clone completed: %s/%s", owner, name)
    metadata = _collect_metadata(clone_path, owner, name, repo)
    repository_id = register(clone_path, metadata)
    return {"repository_id": repository_id, "metadata": metadata}

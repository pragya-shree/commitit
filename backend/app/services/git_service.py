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
from app.models.auth import User, UserRepository
from app.core.config import settings
import uuid

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


import uuid
from sqlalchemy.orm import Session
from app.core.config import settings
from app.models.auth import UserRepository


def clone_repository(github_url: str, user_id: str, db: Session) -> dict:
    """
    Validate, clone, and inspect a public GitHub repository.

    Clones into the config-derived path `settings.REPO_STORAGE_DIR/user_id/repository_id`.
    Saves repository registration inside user_repositories DB table.
    """
    owner, name = parse_github_url(github_url)

    # 1. Generate repository_id
    repository_id = f"cmt_{uuid.uuid4().hex[:8]}"

    # 2. Derive storage path
    user_dir = Path(settings.REPO_STORAGE_DIR) / user_id
    clone_path = user_dir / repository_id

    logger.info("Clone started: %s/%s -> %s", owner, name, clone_path)

    # Ensure parent directories exist
    user_dir.mkdir(parents=True, exist_ok=True)

    try:
        repo = Repo.clone_from(github_url, clone_path, depth=1)
    except GitCommandError as exc:
        if clone_path.exists():
            shutil.rmtree(clone_path, ignore_errors=True)
        logger.warning("Clone failed for %s/%s: %s", owner, name, exc)

        error_text = str(exc).lower()
        if "not found" in error_text or "repository not found" in error_text:
            raise RepositoryNotFoundError(f"Repository not found: {github_url}") from exc
        if "could not read username" in error_text or "authentication failed" in error_text:
            raise RepositoryNotFoundError(
                f"Repository is private or inaccessible: {github_url}"
            ) from exc
        raise CloneFailedError(f"Failed to clone repository: {github_url}") from exc
    except OSError as exc:
        if clone_path.exists():
            shutil.rmtree(clone_path, ignore_errors=True)
        logger.warning("Filesystem error while cloning %s/%s: %s", owner, name, exc)
        raise CloneFailedError(f"Filesystem error while cloning: {exc}") from exc

    logger.info("Clone completed: %s/%s", owner, name)
    metadata = _collect_metadata(clone_path, owner, name, repo)
    default_branch = metadata.get("branch") or "main"

    # Register repository in database if valid user exists
    user_exists = db.query(User).filter(User.id == user_id).first() if user_id else None
    if not user_exists:
        user_exists = db.query(User).first()
        if user_exists:
            user_id = user_exists.id

    if user_exists:
        db_repo = UserRepository(
            id=repository_id,
            user_id=user_id,
            name=name,
            github_owner=owner,
            github_repo=name,
            github_url=github_url,
            default_branch=default_branch,
        )
        db.add(db_repo)
        try:
            db.commit()
            db.refresh(db_repo)
        except Exception as exc:
            db.rollback()
            logger.warning("Could not register UserRepository in DB: %s", exc)

    return {"repository_id": repository_id, "metadata": metadata}


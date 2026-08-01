"""
Database-driven repository registry.
Resolves repository metadata and disk locations dynamically from SQLite configurations.
"""

import uuid
import shutil
from pathlib import Path
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.database import Base, SessionLocal, engine
from app.models.auth import UserRepository, User


class UnknownRepositoryIDError(Exception):
    """Raised when a repository_id was never registered."""


class RepositoryPathMissingError(Exception):
    """Raised when a registered repository's local path no longer exists on disk."""


def register(local_path: Path, metadata: dict | None = None) -> str:
    """
    Register a local clone path and return its new repository_id.
    Ensures a default test user exists and copies the folder contents to configuration-derived directory.
    """
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        user = db.query(User).first()
        if not user:
            user = User(id="test_user_id", username="testuser", password_hash="dummy")
            db.add(user)
            db.commit()
            db.refresh(user)

        repository_id = f"cmt_{uuid.uuid4().hex[:8]}"

        owner = "unknown"
        name = local_path.name
        branch = "main"
        if metadata:
            owner = metadata.get("owner") or "unknown"
            name = metadata.get("name") or local_path.name
            branch = metadata.get("branch") or "main"

        # Copy dummy directory to configured storage path
        target_path = Path(settings.REPO_STORAGE_DIR) / str(user.id) / str(repository_id)
        target_path.parent.mkdir(parents=True, exist_ok=True)
        if target_path.exists():
            shutil.rmtree(target_path)
        shutil.copytree(local_path, target_path)

        db_repo = UserRepository(
            id=repository_id,
            user_id=user.id,
            name=name,
            github_owner=owner,
            github_repo=name,
            github_url=f"https://github.com/{owner}/{name}",
            default_branch=branch,
        )
        db.add(db_repo)
        db.commit()
        db.refresh(db_repo)

        return repository_id
    finally:
        db.close()


def compute_folder_stats(path: Path) -> dict:
    """Walk the directory to dynamically compute file, directory, and byte size counts."""
    file_count = 0
    dir_count = 0
    total_bytes = 0

    if not path.exists():
        return {"files": 0, "directories": 0, "size": "0.0 KB"}

    for p in path.rglob("*"):
        if ".git" in p.parts:
            continue
        if p.is_file():
            file_count += 1
            total_bytes += p.stat().st_size
        elif p.is_dir():
            dir_count += 1

    kb = total_bytes / 1024
    if kb < 1024:
        size_str = f"{kb:.1f} KB"
    else:
        size_str = f"{kb / 1024:.1f} MB"

    return {
        "files": file_count,
        "directories": dir_count,
        "size": size_str,
    }


def resolve(repository_id: str) -> Path:
    """
    Look up the local path for a repository_id from the database or storage disk.
    Derives path dynamically: settings.REPO_STORAGE_DIR / user_id / repository_id.
    """
    db = SessionLocal()
    try:
        repo = db.query(UserRepository).filter(UserRepository.id == repository_id).first()
        if repo:
            path = Path(settings.REPO_STORAGE_DIR) / str(repo.user_id) / str(repository_id)
            if path.exists():
                return path

        storage_base = Path(settings.REPO_STORAGE_DIR)
        if storage_base.exists():
            for user_dir in storage_base.iterdir():
                if user_dir.is_dir():
                    candidate = user_dir / str(repository_id)
                    if candidate.exists():
                        return candidate

        if not repo:
            raise UnknownRepositoryIDError(f"Unknown repository_id: {repository_id}")
        raise RepositoryPathMissingError(f"Repository no longer exists on disk: {repository_id}")
    finally:
        db.close()


def get_metadata(repository_id: str) -> dict | None:
    """
    Return repository owner, name, and default branch metadata from the database or disk,
    calculating dynamic directory statistics on the fly.
    """
    db = SessionLocal()
    try:
        repo = db.query(UserRepository).filter(UserRepository.id == repository_id).first()
        path = resolve(repository_id)
        stats = compute_folder_stats(path)
        return {
            "owner": repo.github_owner if repo else "github",
            "name": repo.github_repo if repo else repository_id,
            "branch": repo.default_branch if repo else "main",
            **stats,
        }
    finally:
        db.close()


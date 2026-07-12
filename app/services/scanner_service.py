"""
Repository scanner service.

Walks a cloned repository on disk to build a folder/file tree, count
files and directories, detect languages by file extension, and find the
largest files. This is filesystem inspection only — no source code is
parsed or analyzed.
"""

import time
from pathlib import Path

from app.core.logging import get_logger

logger = get_logger(__name__)

# Centralized so it's easy to extend later.
IGNORED_DIRS = {
    ".git",
    "node_modules",
    "venv",
    ".venv",
    "dist",
    "build",
    "target",
    "coverage",
    "__pycache__",
    ".idea",
    ".vscode",
}

# Extension -> language, used for the language summary. Extension-based
# only, no parsing.
LANGUAGE_EXTENSIONS = {
    ".py": "Python",
    ".js": "JavaScript",
    ".jsx": "JavaScript",
    ".mjs": "JavaScript",
    ".ts": "TypeScript",
    ".tsx": "TypeScript",
    ".java": "Java",
    ".c": "C",
    ".h": "C",
    ".cpp": "C++",
    ".cc": "C++",
    ".cxx": "C++",
    ".hpp": "C++",
    ".cs": "C#",
    ".go": "Go",
    ".rs": "Rust",
    ".html": "HTML",
    ".htm": "HTML",
    ".css": "CSS",
    ".scss": "SCSS",
    ".json": "JSON",
    ".yaml": "YAML",
    ".yml": "YAML",
    ".md": "Markdown",
    ".sh": "Shell",
    ".bash": "Shell",
    ".sql": "SQL",
}

MAX_LARGEST_FILES = 10


def is_hidden(name: str) -> bool:
    """Treat dotfiles (other than the repo root itself) as hidden."""
    return name.startswith(".") and name not in (".", "..")


def _build_tree(directory: Path) -> dict:
    """Recursively build a JSON-friendly tree node for a directory."""
    children = []
    try:
        entries = sorted(directory.iterdir(), key=lambda p: (p.is_file(), p.name.lower()))
    except PermissionError:
        entries = []

    for entry in entries:
        if entry.is_dir():
            if entry.name in IGNORED_DIRS or is_hidden(entry.name):
                continue
            children.append(_build_tree(entry))
        else:
            if is_hidden(entry.name):
                continue
            children.append({"name": entry.name, "type": "file", "children": None})

    return {"name": directory.name, "type": "directory", "children": children}


def scan_repository(local_path: Path) -> dict:
    """
    Walk the repository at local_path and return scan results:
    total file/directory counts, a language summary, the largest files,
    and a structured project tree.
    """
    start_time = time.time()
    logger.info("Scan started: %s", local_path)
    logger.info("Ignored directories: %s", sorted(IGNORED_DIRS))

    file_count = 0
    dir_count = 0
    languages: dict[str, int] = {}
    largest_files: list[dict] = []

    for root, dirnames, filenames in walk_tree(local_path):
        dir_count += len(dirnames)
        for filename in filenames:
            if is_hidden(filename):
                continue
            file_path = root / filename
            file_count += 1

            language = LANGUAGE_EXTENSIONS.get(file_path.suffix.lower())
            if language:
                languages[language] = languages.get(language, 0) + 1

            try:
                size = file_path.stat().st_size
            except OSError:
                continue

            largest_files.append(
                {
                    "path": str(file_path.relative_to(local_path)),
                    "extension": file_path.suffix or "",
                    "size": size,
                }
            )

    largest_files.sort(key=lambda f: f["size"], reverse=True)
    largest_files = largest_files[:MAX_LARGEST_FILES]

    tree = _build_tree(local_path)

    duration_ms = round((time.time() - start_time) * 1000, 2)
    logger.info(
        "Scan completed: %s (%s files, %sms)", local_path, file_count, duration_ms
    )

    return {
        "total_files": file_count,
        "total_directories": dir_count,
        "languages": languages,
        "largest_files": largest_files,
        "tree": tree,
    }


def walk_tree(root: Path):
    """
    Yield (directory, dirnames, filenames) tuples like os.walk, but
    skipping ignored and hidden directories in-place.
    """
    try:
        entries = list(root.iterdir())
    except (PermissionError, FileNotFoundError):
        return

    dirnames = [
        e.name for e in entries if e.is_dir() and e.name not in IGNORED_DIRS and not is_hidden(e.name)
    ]
    filenames = [e.name for e in entries if e.is_file()]

    yield root, dirnames, filenames

    for dirname in dirnames:
        yield from walk_tree(root / dirname)

"""
Technology Stack detection service.
Detects programming languages, frameworks, tooling, and infrastructure in the repository.
"""

import re
from pathlib import Path

from app.core.logging import get_logger
from app.models.technology import TechnologyEntry
from app.services.dependency_service import detect_manifests

logger = get_logger(__name__)

# Map package names to (Display Name, Category)
DEPENDENCY_MAP = {
    # Python
    "django": ("Django", "framework"),
    "flask": ("Flask", "framework"),
    "fastapi": ("FastAPI", "framework"),
    "pytest": ("Pytest", "tooling"),
    "sqlalchemy": ("SQLAlchemy", "tooling"),
    "celery": ("Celery", "infrastructure"),
    # Node / Frontend / JS / TS
    "react": ("React", "framework"),
    "vue": ("Vue.js", "framework"),
    "svelte": ("Svelte", "framework"),
    "@angular/core": ("Angular", "framework"),
    "express": ("Express", "framework"),
    "@nestjs/core": ("NestJS", "framework"),
    "next": ("Next.js", "framework"),
    "tailwindcss": ("Tailwind CSS", "framework"),
    "eslint": ("ESLint", "tooling"),
    "jest": ("Jest", "tooling"),
    "vite": ("Vite", "tooling"),
    "typescript": ("TypeScript", "language"),
}


def detect_technologies(local_path: Path, scan_result: dict) -> list[TechnologyEntry]:
    """
    Detect languages, frameworks, tooling, and infrastructure in the repository.
    Returns a deduplicated list of TechnologyEntry models.
    """
    detected = {}

    # 1. Detect Languages from scanner results
    languages = scan_result.get("languages", {})
    for lang, count in languages.items():
        if count > 0:
            detected[lang] = TechnologyEntry(name=lang, category="language")

    # 2. File & Directory Markers
    # Docker Check
    if (local_path / "Dockerfile").is_file() or \
       (local_path / "docker-compose.yml").is_file() or \
       (local_path / "docker-compose.yaml").is_file():
        detected["Docker"] = TechnologyEntry(name="Docker", category="infrastructure")

    # GitHub Actions
    workflows_dir = local_path / ".github" / "workflows"
    if workflows_dir.is_dir():
        try:
            yaml_files = [
                f for f in workflows_dir.iterdir()
                if f.is_file() and f.suffix.lower() in (".yml", ".yaml")
            ]
            if yaml_files:
                detected["GitHub Actions"] = TechnologyEntry(name="GitHub Actions", category="infrastructure")
        except OSError:
            pass

    # Tooling markers
    if (local_path / "tsconfig.json").is_file():
        detected["TypeScript Config"] = TechnologyEntry(name="TypeScript", category="language")
        
    if (local_path / "webpack.config.js").is_file() or \
       (local_path / "webpack.config.ts").is_file():
        detected["Webpack"] = TechnologyEntry(name="Webpack", category="tooling")
        
    if (local_path / "vite.config.ts").is_file() or \
       (local_path / "vite.config.js").is_file():
        detected["Vite"] = TechnologyEntry(name="Vite", category="tooling")

    if (local_path / "tailwind.config.js").is_file() or \
       (local_path / "tailwind.config.ts").is_file():
        detected["Tailwind CSS"] = TechnologyEntry(name="Tailwind CSS", category="framework")

    if (local_path / "next.config.js").is_file() or \
       (local_path / "next.config.mjs").is_file():
        detected["Next.js"] = TechnologyEntry(name="Next.js", category="framework")

    # 3. Parse manifest dependencies via dependency_service
    deps = detect_manifests(local_path)
    for dep in deps:
        name_lower = dep["name"].lower()
        if name_lower in DEPENDENCY_MAP:
            display_name, category = DEPENDENCY_MAP[name_lower]
            detected[display_name] = TechnologyEntry(name=display_name, category=category)

    # 4. Check Cargo.toml (Rust)
    cargo_path = local_path / "Cargo.toml"
    if cargo_path.is_file():
        detected["Cargo"] = TechnologyEntry(name="Cargo", category="tooling")
        detected["Rust"] = TechnologyEntry(name="Rust", category="language")
        try:
            cargo_content = cargo_path.read_text(encoding="utf-8")
            if "tokio" in cargo_content:
                detected["Tokio"] = TechnologyEntry(name="Tokio", category="tooling")
            if "actix-web" in cargo_content:
                detected["Actix Web"] = TechnologyEntry(name="Actix Web", category="framework")
            if "axum" in cargo_content:
                detected["Axum"] = TechnologyEntry(name="Axum", category="framework")
        except OSError:
            pass

    # 5. Check go.mod (Go)
    go_mod_path = local_path / "go.mod"
    if go_mod_path.is_file():
        detected["Go"] = TechnologyEntry(name="Go", category="language")
        try:
            go_mod_content = go_mod_path.read_text(encoding="utf-8")
            if "github.com/gin-gonic/gin" in go_mod_content:
                detected["Gin"] = TechnologyEntry(name="Gin", category="framework")
            if "github.com/labstack/echo" in go_mod_content:
                detected["Echo"] = TechnologyEntry(name="Echo", category="framework")
            if "github.com/fiber/gofiber" in go_mod_content:
                detected["Fiber"] = TechnologyEntry(name="Fiber", category="framework")
        except OSError:
            pass

    return list(detected.values())

"""
Unit tests for the Technology Stack detection system.
"""

from pathlib import Path
from app.services.technology_service import detect_technologies


def test_detect_languages_only():
    """Test that languages from scan_result are detected correctly."""
    scan_result = {
        "languages": {
            "Python": 5,
            "TypeScript": 2,
            "HTML": 1,
            "EmptyLang": 0
        }
    }
    technologies = detect_technologies(Path("dummy_path"), scan_result)
    names = {tech.name for tech in technologies}
    
    assert "Python" in names
    assert "TypeScript" in names
    assert "HTML" in names
    assert "EmptyLang" not in names
    
    # Verify categories
    for tech in technologies:
        if tech.name in ("Python", "TypeScript", "HTML"):
            assert tech.category == "language"


def test_detect_docker_and_github_actions(tmp_path):
    """Test detection of Docker and GitHub Actions infrastructure."""
    # Write Dockerfile and github workflow config
    (tmp_path / "Dockerfile").write_text("FROM python:3.9")
    
    workflows_dir = tmp_path / ".github" / "workflows"
    workflows_dir.mkdir(parents=True)
    (workflows_dir / "build.yml").write_text("name: Build")

    technologies = detect_technologies(tmp_path, {})
    names = {tech.name for tech in technologies}
    
    assert "Docker" in names
    assert "GitHub Actions" in names
    
    docker_tech = next(t for t in technologies if t.name == "Docker")
    assert docker_tech.category == "infrastructure"
    
    gha_tech = next(t for t in technologies if t.name == "GitHub Actions")
    assert gha_tech.category == "infrastructure"


def test_detect_package_json_dependencies(tmp_path):
    """Test detection of frameworks and tooling from package.json."""
    pkg_file = tmp_path / "package.json"
    pkg_file.write_text(
        '{\n'
        '  "dependencies": {\n'
        '    "react": "^18.2.0",\n'
        '    "tailwindcss": "^3.0.0"\n'
        '  },\n'
        '  "devDependencies": {\n'
        '    "eslint": "^8.0.0",\n'
        '    "vite": "^5.0.0"\n'
        '  }\n'
        '}'
    )
    
    # TS config and Vite config markers
    (tmp_path / "tsconfig.json").write_text("{}")
    (tmp_path / "vite.config.ts").write_text("export default {}")

    technologies = detect_technologies(tmp_path, {})
    names = {tech.name for tech in technologies}
    
    assert "React" in names
    assert "Tailwind CSS" in names
    assert "ESLint" in names
    assert "Vite" in names
    assert "TypeScript" in names


def test_detect_python_dependencies(tmp_path):
    """Test detection of Python frameworks and tooling."""
    req_file = tmp_path / "requirements.txt"
    req_file.write_text(
        "fastapi==0.115.6\n"
        "pytest>=7.0.0\n"
    )

    technologies = detect_technologies(tmp_path, {})
    names = {tech.name for tech in technologies}
    
    assert "FastAPI" in names
    assert "Pytest" in names
    
    fastapi_tech = next(t for t in technologies if t.name == "FastAPI")
    assert fastapi_tech.category == "framework"


def test_detect_cargo_and_go_mod(tmp_path):
    """Test Rust (Cargo.toml) and Go (go.mod) dependencies."""
    cargo_file = tmp_path / "Cargo.toml"
    cargo_file.write_text(
        "[dependencies]\n"
        "tokio = { version = '1.0' }\n"
        "actix-web = '4.0'\n"
    )
    
    go_file = tmp_path / "go.mod"
    go_file.write_text(
        "module mymodule\n"
        "require github.com/gin-gonic/gin v1.9.0\n"
    )

    technologies = detect_technologies(tmp_path, {})
    names = {tech.name for tech in technologies}
    
    assert "Cargo" in names
    assert "Rust" in names
    assert "Tokio" in names
    assert "Actix Web" in names
    
    assert "Go" in names
    assert "Gin" in names

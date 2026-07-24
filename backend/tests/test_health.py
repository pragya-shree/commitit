"""
Unit tests for the Repository Health analysis backend system.
"""

import pytest
from pathlib import Path
from unittest.mock import patch, MagicMock

from app.services.dependency_service import (
    parse_requirements_txt,
    parse_pyproject_toml,
    parse_package_json,
    score_pinning_locally,
    compare_versions,
    score_dependency_freshness,
)
from app.services.health_service import (
    find_sccs,
    compute_architecture_complexity,
    compute_code_organization,
    compute_documentation_coverage,
    compute_repository_health,
)


def test_find_sccs():
    """Test strongly connected component detection (cycles)."""
    # Simple DAG (no cycles)
    nodes = [{"id": "A"}, {"id": "B"}, {"id": "C"}]
    edges = [
        {"source": "A", "target": "B", "relationship": "imports"},
        {"source": "B", "target": "C", "relationship": "imports"},
    ]
    sccs = find_sccs(nodes, edges)
    # Every node should be in its own single-element component
    assert len(sccs) == 3
    assert all(len(scc) == 1 for scc in sccs)

    # Graph with a cycle (A -> B -> C -> A)
    nodes = [{"id": "A"}, {"id": "B"}, {"id": "C"}, {"id": "D"}]
    edges = [
        {"source": "A", "target": "B", "relationship": "imports"},
        {"source": "B", "target": "C", "relationship": "imports"},
        {"source": "C", "target": "A", "relationship": "imports"},
        {"source": "C", "target": "D", "relationship": "imports"},
    ]
    sccs = find_sccs(nodes, edges)
    # D is separate, but A, B, C are in a cycle together
    cyclic_scc = [scc for scc in sccs if len(scc) > 1]
    assert len(cyclic_scc) == 1
    assert set(cyclic_scc[0]) == {"A", "B", "C"}


def test_compute_architecture_complexity():
    """Test architecture complexity score and description calculations."""
    # 100% acyclic and modular
    nodes = [{"id": "A"}, {"id": "B"}]
    edges = [{"source": "A", "target": "B", "relationship": "imports"}]
    score, desc = compute_architecture_complexity(nodes, edges)
    assert score == 100
    assert "100% of modules/symbols are free from cyclic dependencies" in desc

    # High cyclic complexity
    nodes = [{"id": "A"}, {"id": "B"}]
    edges = [
        {"source": "A", "target": "B", "relationship": "imports"},
        {"source": "B", "target": "A", "relationship": "imports"},
    ]
    score, desc = compute_architecture_complexity(nodes, edges)
    # All nodes are cyclic (0% acyclic)
    assert score < 50
    assert "0% of modules/symbols are free from cyclic dependencies" in desc


def test_compute_code_organization(tmp_path):
    """Test Gini index file uniformity and Shannon entropy folder balance."""
    # Create files in folders to test balance and uniformity
    # Perfect balance: 2 files in folder A, 2 files in folder B
    (tmp_path / "folder_a").mkdir()
    (tmp_path / "folder_b").mkdir()
    (tmp_path / "folder_a" / "file1.py").write_text("a" * 100)
    (tmp_path / "folder_a" / "file2.py").write_text("a" * 100)
    (tmp_path / "folder_b" / "file3.py").write_text("a" * 100)
    (tmp_path / "folder_b" / "file4.py").write_text("a" * 100)

    score, desc = compute_code_organization(tmp_path)
    # Since all sizes are exactly 100, Gini should be 0 (100% uniform)
    # Balanced folders should also be high
    assert score >= 90
    assert "Folder structure balance is 100%" in desc
    assert "File size uniformity is 100%" in desc

    # Now create extreme imbalance (one giant file, one tiny file, one empty folder)
    # Delete previous files
    for p in tmp_path.glob("**/*"):
        if p.is_file():
            p.unlink()
    (tmp_path / "folder_a" / "giant.py").write_text("a" * 100000)
    (tmp_path / "folder_b" / "tiny.py").write_text("a" * 10)
    (tmp_path / "folder_c").mkdir(exist_ok=True) # empty folder

    score2, desc2 = compute_code_organization(tmp_path)
    # Gini uniformity will drop, and empty folders penalty should apply
    assert score2 < score
    assert "empty folder" in desc2.lower()


def test_compute_documentation_coverage_agnostic(tmp_path):
    """Test language-agnostic documentation fallback logic."""
    # No python symbols, just generic files
    (tmp_path / "main.js").write_text("console.log('hi')")
    (tmp_path / "README.md").write_text("# Project")

    score, desc = compute_documentation_coverage(tmp_path, [])
    # README present -> 100, Doc ratio (1 doc file, 1 code file) -> 10/10 -> 1000% score (capped at 100)
    # Overall score should be 100
    assert score == 100
    assert "README present: True" in desc


def test_compute_documentation_coverage_ast(tmp_path):
    """Test AST-level docstring coverage logic."""
    # Mock parse modules
    modules = [
        {
            "path": "app/main.py",
            "docstring": "Module docstring",
            "classes": [
                {
                    "name": "MyClass",
                    "docstring": None, # undocumented
                    "methods": [
                        {"name": "method1", "docstring": "Method docstring"}
                    ]
                }
            ],
            "functions": [
                {"name": "func1", "docstring": None} # undocumented
            ]
        }
    ]
    # Total symbols = 1 module + 1 class + 1 method + 1 func = 4
    # Documented symbols = module + method = 2
    # AST coverage = 50%
    # No README -> 0
    # Expected overall: 0.3 * 0 + 0.7 * 50 = 35

    score, desc = compute_documentation_coverage(tmp_path, modules)
    assert score == 35
    assert "50% contain docstrings" in desc


def test_parse_requirements_txt(tmp_path):
    """Test parsing pip requirements.txt."""
    req_file = tmp_path / "requirements.txt"
    req_file.write_text(
        "# This is a comment\n"
        "fastapi==0.115.6\n"
        "requests>=2.28.0; python_version > '3.7'\n"
        "-r other.txt\n"
        "uvicorn\n"
    )
    deps = parse_requirements_txt(req_file)
    assert len(deps) == 3
    assert deps[0]["name"] == "fastapi"
    assert deps[0]["constraint"] == "==0.115.6"
    assert deps[1]["name"] == "requests"
    assert deps[1]["constraint"] == ">=2.28.0"
    assert deps[2]["name"] == "uvicorn"
    assert deps[2]["constraint"] == ""


def test_parse_pyproject_toml(tmp_path):
    """Test parsing pyproject.toml."""
    toml_file = tmp_path / "pyproject.toml"
    toml_file.write_text(
        "[project]\n"
        "dependencies = [\n"
        "    \"fastapi>=0.110.0\",\n"
        "    \"requests\"\n"
        "]\n"
        "[tool.poetry.dependencies]\n"
        "python = \"^3.9\"\n"
        "pydantic = \"^2.0.0\"\n"
    )
    deps = parse_pyproject_toml(toml_file)
    # Should get dependencies from both project and tool.poetry
    assert len(deps) == 3
    names = {d["name"] for d in deps}
    assert "fastapi" in names
    assert "requests" in names
    assert "pydantic" in names
    assert "python" not in names # Python version skipped


def test_parse_package_json(tmp_path):
    """Test parsing package.json."""
    pkg_file = tmp_path / "package.json"
    pkg_file.write_text(
        '{\n'
        '  "dependencies": {\n'
        '    "react": "^18.2.0",\n'
        '    "lodash": "4.17.21"\n'
        '  },\n'
        '  "devDependencies": {\n'
        '    "typescript": "^5.0.0"\n'
        '  }\n'
        '}'
    )
    deps = parse_package_json(pkg_file)
    assert len(deps) == 3
    names = {d["name"] for d in deps}
    assert "react" in names
    assert "lodash" in names
    assert "typescript" in names


def test_score_pinning_locally():
    """Test deterministic pinning quality evaluation."""
    # Range pinning
    assert score_pinning_locally("^1.2.3", "pip") == 100
    assert score_pinning_locally(">=1.0.0,<2.0.0", "pip") == 100
    assert score_pinning_locally("~=2.3.0", "pip") == 100

    # Rigid pinning
    assert score_pinning_locally("==1.2.3", "pip") == 85
    assert score_pinning_locally("1.2.3", "npm") == 85

    # Unpinned / Wildcard
    assert score_pinning_locally("", "pip") == 40
    assert score_pinning_locally("*", "npm") == 40


def test_compare_versions():
    """Test semver comparison version distance score."""
    # Match
    assert compare_versions("1.2.3", "1.2.3") == 100
    # Patch behind
    assert compare_versions("1.2.2", "1.2.3") == 95
    # Minor behind
    assert compare_versions("1.1.0", "1.2.0") == 80
    # Major behind
    assert compare_versions("1.0.0", "2.0.0") == 50


def test_score_dependency_freshness_local():
    """Test overall dependency evaluation in offline/local mode."""
    deps = [
        {"name": "fastapi", "constraint": "^0.110.0", "manager": "pip"},
        {"name": "requests", "constraint": "==2.31.0", "manager": "pip"},
        {"name": "unpinned", "constraint": "", "manager": "pip"},
    ]
    # Local scores: ^0.110.0 -> 100, ==2.31.0 -> 85, "" -> 40
    # Average: (100 + 85 + 40) / 3 = 75
    score, descs = score_dependency_freshness(deps, online=False)
    assert score == 75
    assert "range pinned" in descs[0]


@patch("urllib.request.urlopen")
def test_score_dependency_freshness_online(mock_urlopen):
    """Test extensible online version checker with mocked PyPI."""
    # Mock urllib response for PyPI
    mock_response = MagicMock()
    mock_response.read.return_value = b'{"info": {"version": "0.120.0"}}'
    mock_urlopen.return_value.__enter__.return_value = mock_response

    deps = [
        {"name": "fastapi", "constraint": "==0.115.0", "manager": "pip"}, # minor behind (0.115 vs 0.120) -> 80
    ]
    score, descs = score_dependency_freshness(deps, online=True)
    assert score == 80
    assert "minor version" in descs[0]


def test_compute_repository_health_orchestration(tmp_path):
    """Test that orchestration builds all four HealthIndicators."""
    # Create simple structure
    (tmp_path / "README.md").write_text("# Hello")
    (tmp_path / "main.py").write_text("print('hi')")
    (tmp_path / "requirements.txt").write_text("requests==2.31.0")

    scan_result = {"total_files": 2, "total_directories": 0}
    parse_result = {"modules": []}
    graph_result = {"nodes": [], "edges": []}

    indicators = compute_repository_health(
        tmp_path, scan_result, parse_result, graph_result, online_dependencies=False
    )
    
    assert len(indicators) == 4
    ids = {ind.id for ind in indicators}
    assert ids == {"architecture", "organization", "documentation", "dependencies"}
    assert all(0 <= ind.score <= 100 for ind in indicators)

"""
Tests for repository scanning (Milestone 3).
"""

from fastapi.testclient import TestClient

from app.main import app
from app.services.repository_store import register
from app.services.scanner_service import scan_repository

client = TestClient(app)


def _make_sample_repo(tmp_path):
    """Build a small fake repository on disk for scanning."""
    (tmp_path / "app").mkdir()
    (tmp_path / "app" / "main.py").write_text("print('hi')" * 5)
    (tmp_path / "app" / "utils.py").write_text("x = 1")
    (tmp_path / "README.md").write_text("# Hello")
    (tmp_path / "style.css").write_text("body { color: red; }")

    # Should be ignored entirely.
    ignored = tmp_path / "node_modules"
    ignored.mkdir()
    (ignored / "package.js").write_text("module.exports = {}")

    hidden = tmp_path / ".git"
    hidden.mkdir()
    (hidden / "config").write_text("junk")

    return tmp_path


def test_scan_repository_service_directly(tmp_path):
    repo_path = _make_sample_repo(tmp_path)
    result = scan_repository(repo_path)

    assert result["total_files"] == 4  # main.py, utils.py, README.md, style.css
    assert result["languages"]["Python"] == 2
    assert result["languages"]["Markdown"] == 1
    assert result["languages"]["CSS"] == 1
    assert "JavaScript" not in result["languages"]  # node_modules ignored

    largest = result["largest_files"]
    assert largest[0]["path"] == "app/main.py"

    tree_names = {child["name"] for child in result["tree"]["children"]}
    assert "node_modules" not in tree_names
    assert ".git" not in tree_names
    assert "app" in tree_names
    assert "README.md" in tree_names


def test_scan_endpoint_success(tmp_path):
    repo_path = _make_sample_repo(tmp_path)
    repository_id = register(repo_path)

    response = client.get(f"/api/v1/repository/{repository_id}/scan")
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["repository_id"] == repository_id
    assert data["summary"]["total_files"] == 4
    assert data["languages"]["Python"] == 2
    assert len(data["largest_files"]) <= 10
    assert data["tree"]["type"] == "directory"


def test_scan_endpoint_unknown_repository_id():
    response = client.get("/api/v1/repository/cmt_doesnotexist/scan")
    assert response.status_code == 404


def test_scan_endpoint_path_missing(tmp_path):
    repo_path = tmp_path / "gone"
    repo_path.mkdir()
    repository_id = register(repo_path)
    repo_path.rmdir()  # simulate the directory disappearing after registration

    response = client.get(f"/api/v1/repository/{repository_id}/scan")
    assert response.status_code == 410


def test_scan_empty_repository(tmp_path):
    empty_repo = tmp_path / "empty"
    empty_repo.mkdir()

    result = scan_repository(empty_repo)
    assert result["total_files"] == 0
    assert result["total_directories"] == 0
    assert result["languages"] == {}
    assert result["largest_files"] == []
    assert result["tree"]["children"] == []

"""
Tests for repository ingestion (Milestone 2).
"""

from pathlib import Path
from unittest.mock import MagicMock, patch

from fastapi.testclient import TestClient
from git.exc import GitCommandError

from app.main import app

client = TestClient(app)


def test_clone_invalid_url():
    response = client.post("/api/v1/repository/clone", json={"github_url": ""})
    assert response.status_code == 400


def test_clone_non_github_url():
    response = client.post(
        "/api/v1/repository/clone",
        json={"github_url": "https://gitlab.com/owner/repo"},
    )
    assert response.status_code == 400


def test_clone_malformed_url():
    response = client.post(
        "/api/v1/repository/clone",
        json={"github_url": "not-a-url"},
    )
    assert response.status_code == 400


@patch("app.services.git_service.Repo.clone_from")
def test_clone_repository_not_found(mock_clone_from):
    mock_clone_from.side_effect = GitCommandError(
        "clone", 128, stderr="remote: Repository not found."
    )
    response = client.post(
        "/api/v1/repository/clone",
        json={"github_url": "https://github.com/owner/does-not-exist"},
    )
    assert response.status_code == 404


@patch("app.services.git_service.Repo.clone_from")
def test_clone_failure(mock_clone_from):
    mock_clone_from.side_effect = GitCommandError("clone", 128, stderr="network error")
    response = client.post(
        "/api/v1/repository/clone",
        json={"github_url": "https://github.com/owner/repo"},
    )
    assert response.status_code == 502


@patch("app.services.git_service.Repo.clone_from")
def test_clone_success(mock_clone_from, tmp_path):
    # Simulate GitPython creating files on disk during clone.
    def fake_clone(url, to_path, depth):
        to_path = Path(to_path) if not isinstance(to_path, Path) else to_path
        to_path.mkdir(parents=True, exist_ok=True)
        (to_path / "README.md").write_text("hello")
        (to_path / "src").mkdir()
        (to_path / "src" / "main.py").write_text("print('hi')")
        mock_repo = MagicMock()
        mock_repo.active_branch.name = "main"
        return mock_repo

    mock_clone_from.side_effect = fake_clone

    response = client.post(
        "/api/v1/repository/clone",
        json={"github_url": "https://github.com/owner/repo"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["repository_id"].startswith("cmt_")
    assert data["repository"]["owner"] == "owner"
    assert data["repository"]["name"] == "repo"
    assert data["repository"]["files"] == 2
    assert data["repository"]["directories"] == 1
    assert "local_path" not in data["repository"]

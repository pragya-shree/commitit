"""
Tests for the Repository Knowledge Model (Milestone 5).
"""

from fastapi.testclient import TestClient

from app.main import app
from app.services import knowledge_service
from app.services.repository_store import register

client = TestClient(app)


SAMPLE_METADATA = {
    "owner": "octocat",
    "name": "sample",
    "branch": "main",
    "files": 0,
    "directories": 0,
    "size": "0.0 KB",
}


def _make_sample_repo(tmp_path):
    (tmp_path / "app").mkdir()
    (tmp_path / "app" / "base.py").write_text(
        'class BaseService:\n    """Base class."""\n\n    def run(self):\n        pass\n'
    )
    (tmp_path / "app" / "user_service.py").write_text(
        "import os\n"
        "from app.base import BaseService\n\n\n"
        "class UserService(BaseService):\n"
        "    def greet(self):\n"
        "        return os.getcwd()\n"
    )
    (tmp_path / "README.md").write_text("# Sample")
    return tmp_path


def test_build_creates_and_stores_knowledge_model(tmp_path):
    repo_path = _make_sample_repo(tmp_path)
    repository_id = register(repo_path, SAMPLE_METADATA)

    model = knowledge_service.build(repository_id, repo_path)

    assert model.repository_id == repository_id
    assert model.repository.owner == "octocat"
    assert model.scan_summary.total_files == 3
    assert model.parse_summary.total_files == 2
    assert model.graph_summary.total_nodes > 0
    assert model.graph_summary.total_edges > 0
    assert model.version == "1.0"
    assert model.created_at is not None


def test_get_or_build_returns_cached_model_on_second_call(tmp_path):
    repo_path = _make_sample_repo(tmp_path)
    repository_id = register(repo_path, SAMPLE_METADATA)

    first = knowledge_service.get_or_build(repository_id, repo_path)

    # Modify the repository on disk after the first build.
    (repo_path / "app" / "extra.py").write_text("def extra():\n    pass\n")

    second = knowledge_service.get_or_build(repository_id, repo_path)

    # Cached model returned unchanged; the new file was not picked up.
    assert second is first
    assert second.parse_summary.total_files == 2


def test_build_overwrites_existing_model(tmp_path):
    repo_path = _make_sample_repo(tmp_path)
    repository_id = register(repo_path, SAMPLE_METADATA)

    first = knowledge_service.build(repository_id, repo_path)
    assert first.parse_summary.total_files == 2

    (repo_path / "app" / "extra.py").write_text("def extra():\n    pass\n")

    second = knowledge_service.build(repository_id, repo_path)
    assert second.parse_summary.total_files == 3
    assert knowledge_service.get_or_build(repository_id, repo_path) is second


def test_knowledge_model_uses_fallback_metadata_when_none_registered(tmp_path):
    repo_path = _make_sample_repo(tmp_path)
    repository_id = register(repo_path)  # no metadata provided

    model = knowledge_service.build(repository_id, repo_path)
    assert model.repository.owner == "unknown"
    assert model.repository.name == repo_path.name


def test_knowledge_model_consistent_with_individual_endpoints(tmp_path):
    repo_path = _make_sample_repo(tmp_path)
    repository_id = register(repo_path, SAMPLE_METADATA)

    knowledge_resp = client.get(f"/api/v1/repository/{repository_id}/knowledge").json()
    scan_resp = client.get(f"/api/v1/repository/{repository_id}/scan").json()
    parse_resp = client.get(f"/api/v1/repository/{repository_id}/parse").json()
    deps_resp = client.get(f"/api/v1/repository/{repository_id}/dependencies").json()

    k = knowledge_resp["knowledge"]
    assert k["scan_summary"] == scan_resp["summary"]
    assert k["languages"] == scan_resp["languages"]
    assert k["tree"] == scan_resp["tree"]
    assert k["parse_summary"] == parse_resp["summary"]
    assert k["modules"] == parse_resp["modules"]
    assert k["graph_summary"] == deps_resp["summary"]
    assert k["nodes"] == deps_resp["nodes"]
    assert k["edges"] == deps_resp["edges"]


def test_knowledge_endpoint_success(tmp_path):
    repo_path = _make_sample_repo(tmp_path)
    repository_id = register(repo_path, SAMPLE_METADATA)

    response = client.get(f"/api/v1/repository/{repository_id}/knowledge")
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["knowledge"]["repository_id"] == repository_id
    assert data["knowledge"]["repository"]["owner"] == "octocat"
    assert "local_path" not in data["knowledge"]["repository"]
    assert "local_path" not in data["knowledge"]


def test_knowledge_endpoint_unknown_repository_id():
    response = client.get("/api/v1/repository/cmt_doesnotexist/knowledge")
    assert response.status_code == 404


def test_knowledge_endpoint_path_missing(tmp_path):
    repo_path = tmp_path / "gone"
    repo_path.mkdir()
    repository_id = register(repo_path, SAMPLE_METADATA)
    repo_path.rmdir()

    response = client.get(f"/api/v1/repository/{repository_id}/knowledge")
    assert response.status_code == 410

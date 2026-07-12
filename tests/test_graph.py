"""
Tests for the dependency graph engine (Milestone 4B).
"""

from fastapi.testclient import TestClient

from app.main import app
from app.services.graph_service import build_dependency_graph
from app.services.repository_store import register

client = TestClient(app)


BASE_MODULE = '''\
class BaseService:
    """Base for all services."""

    def run(self):
        pass
'''

CHILD_MODULE = '''\
import os
from app.base import BaseService


class UserService(BaseService):
    """Handles users."""

    def greet(self):
        self.helper()
        os.getcwd()

    def helper(self):
        pass


def standalone():
    helper_function()


def helper_function():
    pass
'''


def _make_sample_repo(tmp_path):
    (tmp_path / "app").mkdir()
    (tmp_path / "app" / "base.py").write_text(BASE_MODULE)
    (tmp_path / "app" / "user_service.py").write_text(CHILD_MODULE)
    return tmp_path


def test_graph_imports(tmp_path):
    repo_path = _make_sample_repo(tmp_path)
    result = build_dependency_graph(repo_path)

    import_edges = [e for e in result["edges"] if e["relationship"] == "imports"]
    # user_service.py imports os and app.base.BaseService
    sources = {e["source"] for e in import_edges}
    assert "module:app.user_service" in sources

    targets = {e["target"] for e in import_edges}
    assert "module:os" in targets
    assert "module:app.base.BaseService" in targets


def test_graph_inheritance(tmp_path):
    repo_path = _make_sample_repo(tmp_path)
    result = build_dependency_graph(repo_path)

    inherit_edges = [e for e in result["edges"] if e["relationship"] == "inherits"]
    assert len(inherit_edges) == 1
    edge = inherit_edges[0]
    assert edge["source"] == "class:app.user_service.UserService"
    assert edge["target"] == "class:app.base.BaseService"


def test_graph_function_calls(tmp_path):
    repo_path = _make_sample_repo(tmp_path)
    result = build_dependency_graph(repo_path)

    call_edges = [e for e in result["edges"] if e["relationship"] == "calls"]
    call_pairs = {(e["source"], e["target"]) for e in call_edges}

    # UserService.greet() calls self.helper() -> resolved to UserService.helper method
    assert (
        "function:app.user_service.UserService.greet",
        "function:app.user_service.UserService.helper",
    ) in call_pairs

    # standalone() calls helper_function()
    assert (
        "function:app.user_service.standalone",
        "function:app.user_service.helper_function",
    ) in call_pairs

    # greet() also calls os.getcwd() -> best-effort external call node
    external_targets = {e["target"] for e in call_edges if "os.getcwd" in e["target"]}
    assert external_targets


def test_graph_node_shape(tmp_path):
    repo_path = _make_sample_repo(tmp_path)
    result = build_dependency_graph(repo_path)

    for node in result["nodes"]:
        assert set(node.keys()) == {"id", "type", "name"}
        assert node["type"] in {"module", "class", "function"}

    for edge in result["edges"]:
        assert set(edge.keys()) == {"source", "target", "relationship"}
        assert edge["relationship"] in {"imports", "inherits", "calls"}


def test_graph_empty_repository(tmp_path):
    empty_repo = tmp_path / "empty"
    empty_repo.mkdir()

    result = build_dependency_graph(empty_repo)
    assert result["total_nodes"] == 0
    assert result["total_edges"] == 0
    assert result["nodes"] == []
    assert result["edges"] == []


def test_graph_repository_without_python_files(tmp_path):
    (tmp_path / "README.md").write_text("# Hello")
    (tmp_path / "notes.txt").write_text("just text")

    result = build_dependency_graph(tmp_path)
    assert result["total_nodes"] == 0
    assert result["total_edges"] == 0


def test_dependencies_endpoint_success(tmp_path):
    repo_path = _make_sample_repo(tmp_path)
    repository_id = register(repo_path)

    response = client.get(f"/api/v1/repository/{repository_id}/dependencies")
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["repository_id"] == repository_id
    assert data["summary"]["total_nodes"] == len(data["nodes"])
    assert data["summary"]["total_edges"] == len(data["edges"])
    assert data["summary"]["total_nodes"] > 0


def test_dependencies_endpoint_unknown_repository_id():
    response = client.get("/api/v1/repository/cmt_doesnotexist/dependencies")
    assert response.status_code == 404


def test_dependencies_endpoint_path_missing(tmp_path):
    repo_path = tmp_path / "gone"
    repo_path.mkdir()
    repository_id = register(repo_path)
    repo_path.rmdir()

    response = client.get(f"/api/v1/repository/{repository_id}/dependencies")
    assert response.status_code == 410

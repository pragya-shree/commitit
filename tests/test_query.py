"""
Tests for the Semantic Repository Query Engine (Milestone 6).
"""

from fastapi.testclient import TestClient

from app.main import app
from app.services import knowledge_service, query_service
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
        'class BaseService:\n    """Base for all services."""\n\n    def run(self):\n        pass\n'
    )
    (tmp_path / "app" / "user_service.py").write_text(
        "import os\n"
        "from app.base import BaseService\n\n\n"
        "class UserService(BaseService):\n"
        '    """Handles users."""\n\n'
        "    def greet(self):\n"
        "        self.helper()\n"
        "        return os.getcwd()\n\n"
        "    def helper(self):\n"
        "        pass\n\n\n"
        "def standalone():\n"
        "    pass\n"
    )
    (tmp_path / "README.md").write_text("# Sample")
    return tmp_path


def _build_model(tmp_path):
    repo_path = _make_sample_repo(tmp_path)
    repository_id = register(repo_path, SAMPLE_METADATA)
    model = knowledge_service.build(repository_id, repo_path)
    return repository_id, model


# --- query_service unit tests (pure functions, no HTTP) ---


def test_list_classes(tmp_path):
    _, model = _build_model(tmp_path)
    results = query_service.list_classes(model)
    names = {c["name"] for c in results}
    assert names == {"BaseService", "UserService"}

    filtered = query_service.list_classes(model, "user")
    assert {c["name"] for c in filtered} == {"UserService"}
    assert filtered[0]["methods"] == ["greet", "helper"]
    assert filtered[0]["bases"] == ["BaseService"]


def test_list_functions(tmp_path):
    _, model = _build_model(tmp_path)
    results = query_service.list_functions(model)
    names = {f["name"] for f in results}
    assert names == {"run", "greet", "helper", "standalone"}

    filtered = query_service.list_functions(model, "greet")
    assert len(filtered) == 1
    assert filtered[0]["qualified_name"] == "app/user_service.py::UserService.greet"


def test_list_imports(tmp_path):
    _, model = _build_model(tmp_path)
    results = query_service.list_imports(model)
    imported = {r["imported"] for r in results}
    assert "os" in imported
    assert "app.base.BaseService" in imported

    filtered = query_service.list_imports(model, "base")
    assert all("base" in r["imported"].lower() for r in filtered)


def test_list_files(tmp_path):
    _, model = _build_model(tmp_path)
    results = query_service.list_files(model)
    paths = {r["path"] for r in results}
    assert "app/base.py" in paths
    assert "app/user_service.py" in paths
    assert "README.md" in paths

    filtered = query_service.list_files(model, "user")
    assert {r["path"] for r in filtered} == {"app/user_service.py"}


def test_list_symbols(tmp_path):
    _, model = _build_model(tmp_path)
    results = query_service.list_symbols(model, "user")
    types = {r["type"] for r in results}
    assert "class" in types

    all_symbols = query_service.list_symbols(model)
    names = {s["name"] for s in all_symbols}
    assert "BaseService" in names
    assert "standalone" in names


def test_get_relationships(tmp_path):
    _, model = _build_model(tmp_path)
    rel = query_service.get_relationships(model, "UserService")

    assert rel["matched_node_ids"]
    outgoing_relationships = {edge.relationship for edge in rel["outgoing"]}
    assert "inherits" in outgoing_relationships

    incoming = query_service.get_relationships(model, "BaseService")
    incoming_relationships = {edge.relationship for edge in incoming["incoming"]}
    assert "inherits" in incoming_relationships


def test_get_relationships_no_match(tmp_path):
    _, model = _build_model(tmp_path)
    rel = query_service.get_relationships(model, "NoSuchSymbolAtAll")
    assert rel["matched_node_ids"] == []
    assert rel["outgoing"] == []
    assert rel["incoming"] == []


def test_search(tmp_path):
    _, model = _build_model(tmp_path)

    result = query_service.search(model, "octocat")
    assert result["repository_match"] is True

    result = query_service.search(model, "user")
    assert result["repository_match"] is False
    assert any(c["name"] == "UserService" for c in result["classes"])
    assert any(f["path"] == "app/user_service.py" for f in result["files"])


# --- endpoint tests (HTTP layer) ---


def test_query_symbols_endpoint(tmp_path):
    repository_id, _ = _build_model(tmp_path)
    response = client.get(f"/api/v1/repository/{repository_id}/query/symbols", params={"name": "user"})
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["count"] == len(data["results"])
    assert any(r["name"] == "UserService" for r in data["results"])


def test_query_classes_endpoint(tmp_path):
    repository_id, _ = _build_model(tmp_path)
    response = client.get(f"/api/v1/repository/{repository_id}/query/classes")
    assert response.status_code == 200
    data = response.json()
    assert data["count"] == 2


def test_query_functions_endpoint(tmp_path):
    repository_id, _ = _build_model(tmp_path)
    response = client.get(f"/api/v1/repository/{repository_id}/query/functions", params={"name": "helper"})
    assert response.status_code == 200
    data = response.json()
    assert data["count"] == 1
    assert data["results"][0]["name"] == "helper"


def test_query_imports_endpoint(tmp_path):
    repository_id, _ = _build_model(tmp_path)
    response = client.get(f"/api/v1/repository/{repository_id}/query/imports")
    assert response.status_code == 200
    data = response.json()
    assert data["count"] >= 2


def test_query_files_endpoint(tmp_path):
    repository_id, _ = _build_model(tmp_path)
    response = client.get(f"/api/v1/repository/{repository_id}/query/files", params={"name": "readme"})
    assert response.status_code == 200
    data = response.json()
    assert data["count"] == 1
    assert data["results"][0]["path"] == "README.md"


def test_query_relationships_endpoint(tmp_path):
    repository_id, _ = _build_model(tmp_path)
    response = client.get(
        f"/api/v1/repository/{repository_id}/query/relationships", params={"symbol": "UserService"}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["relationships"]["symbol"] == "UserService"
    assert data["relationships"]["matched_node_ids"]


def test_search_endpoint(tmp_path):
    repository_id, _ = _build_model(tmp_path)
    response = client.get(f"/api/v1/repository/{repository_id}/search", params={"q": "base"})
    assert response.status_code == 200
    data = response.json()
    assert data["search"]["query"] == "base"
    assert any(c["name"] == "BaseService" for c in data["search"]["classes"])


def test_query_endpoints_never_trigger_build(tmp_path):
    """Query endpoints must 404 rather than build when no model is cached yet."""
    repo_path = _make_sample_repo(tmp_path)
    repository_id = register(repo_path, SAMPLE_METADATA)  # registered, but knowledge not yet built

    response = client.get(f"/api/v1/repository/{repository_id}/query/classes")
    assert response.status_code == 404

    response = client.get(f"/api/v1/repository/{repository_id}/search", params={"q": "anything"})
    assert response.status_code == 404

    # Confirm it truly never built anything for this id.
    assert knowledge_service.get(repository_id) is None


def test_query_unknown_repository_id_returns_404():
    response = client.get("/api/v1/repository/cmt_doesnotexist/query/symbols")
    assert response.status_code == 404

    response = client.get(
        "/api/v1/repository/cmt_doesnotexist/query/relationships", params={"symbol": "x"}
    )
    assert response.status_code == 404

    response = client.get("/api/v1/repository/cmt_doesnotexist/search", params={"q": "x"})
    assert response.status_code == 404

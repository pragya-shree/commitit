"""
Tests for the AI Context Builder (Milestone 7).
"""

from fastapi.testclient import TestClient

from app.main import app
from app.services import context_service, knowledge_service
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
        '    """Handles user authentication and account management."""\n\n'
        "    def authenticate(self, username):\n"
        "        self.helper()\n"
        "        return os.getcwd()\n\n"
        "    def helper(self):\n"
        "        pass\n\n\n"
        "def standalone():\n"
        "    pass\n"
    )
    (tmp_path / "README.md").write_text("# Sample project about users")
    return tmp_path


def _build_model(tmp_path):
    repo_path = _make_sample_repo(tmp_path)
    repository_id = register(repo_path, SAMPLE_METADATA)
    model = knowledge_service.build(repository_id, repo_path)
    return repository_id, model


# --- extract_keywords ---


def test_extract_keywords_filters_stopwords_and_short_words():
    keywords = context_service.extract_keywords("How does the UserService class handle authentication?")
    assert "userservice" in keywords
    assert "class" in keywords
    assert "handle" in keywords
    assert "authentication" in keywords
    # stopwords / short words removed
    assert "how" not in keywords
    assert "does" not in keywords
    assert "the" not in keywords


def test_extract_keywords_deduplicates_preserving_order():
    keywords = context_service.extract_keywords("UserService UserService userservice authentication")
    assert keywords.count("userservice") == 1
    assert keywords[0] == "userservice"


def test_extract_keywords_empty_question():
    assert context_service.extract_keywords("???...") == []


# --- build_context (pure service) ---


def test_build_context_finds_relevant_class(tmp_path):
    _, model = _build_model(tmp_path)
    context = context_service.build_context(model, "How does UserService authenticate users?")

    class_names = {c["name"] for c in context["classes"]}
    assert "UserService" in class_names

    matched = next(c for c in context["classes"] if c["name"] == "UserService")
    assert matched["score"] >= 1
    assert "BaseService" in matched["bases"]


def test_build_context_finds_relevant_function(tmp_path):
    _, model = _build_model(tmp_path)
    context = context_service.build_context(model, "What does the authenticate method do?")

    func_names = {f["name"] for f in context["functions"]}
    assert "authenticate" in func_names


def test_build_context_finds_relevant_files(tmp_path):
    _, model = _build_model(tmp_path)
    context = context_service.build_context(model, "Tell me about user_service")

    paths = {f["path"] for f in context["files"]}
    assert "app/user_service.py" in paths


def test_build_context_includes_relationships_for_matched_symbols(tmp_path):
    _, model = _build_model(tmp_path)
    context = context_service.build_context(model, "Explain the UserService class")

    assert context["relationships"]
    symbols = {r["symbol"] for r in context["relationships"]}
    assert "UserService" in symbols
    rel = next(r for r in context["relationships"] if r["symbol"] == "UserService")
    relationship_types = {edge.relationship for edge in rel["outgoing"]}
    assert "inherits" in relationship_types


def test_build_context_includes_repository_metadata(tmp_path):
    _, model = _build_model(tmp_path)
    context = context_service.build_context(model, "anything")
    assert context["repository"].owner == "octocat"


def test_build_context_summary_counts_are_consistent(tmp_path):
    _, model = _build_model(tmp_path)
    context = context_service.build_context(model, "UserService authenticate")

    summary = context["summary"]
    assert summary["matched_classes"] == len(context["classes"])
    assert summary["matched_functions"] == len(context["functions"])
    assert summary["matched_files"] == len(context["files"])
    assert summary["matched_imports"] == len(context["imports"])
    assert summary["matched_relationships"] == len(context["relationships"])
    assert summary["keywords_used"] == len(context["keywords"])


def test_build_context_no_matches_returns_empty_lists(tmp_path):
    _, model = _build_model(tmp_path)
    context = context_service.build_context(model, "completely unrelated nonexistent symbol xyzxyz")

    assert context["classes"] == []
    assert context["functions"] == []
    assert context["files"] == []
    assert context["imports"] == []
    assert context["relationships"] == []


def test_build_context_never_touches_disk_after_repo_removed(tmp_path):
    """Context building must work purely from the cached model, even if the repo path is gone."""
    repo_path = _make_sample_repo(tmp_path)
    repository_id = register(repo_path, SAMPLE_METADATA)
    model = knowledge_service.build(repository_id, repo_path)

    import shutil

    shutil.rmtree(repo_path)  # repo no longer exists on disk

    context = context_service.build_context(model, "UserService authenticate")
    assert any(c["name"] == "UserService" for c in context["classes"])


# --- endpoint tests ---


def test_context_endpoint_success(tmp_path):
    repository_id, _ = _build_model(tmp_path)
    response = client.post(
        f"/api/v1/repository/{repository_id}/context",
        json={"question": "How does UserService authenticate users?"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["repository_id"] == repository_id
    assert data["context"]["question"] == "How does UserService authenticate users?"
    assert any(c["name"] == "UserService" for c in data["context"]["classes"])


def test_context_endpoint_unknown_repository_id():
    response = client.post(
        "/api/v1/repository/cmt_doesnotexist/context",
        json={"question": "anything"},
    )
    assert response.status_code == 404


def test_context_endpoint_never_triggers_build(tmp_path):
    """Context endpoint must 404 rather than build when no model is cached yet."""
    repo_path = _make_sample_repo(tmp_path)
    repository_id = register(repo_path, SAMPLE_METADATA)  # registered, but not analyzed

    response = client.post(
        f"/api/v1/repository/{repository_id}/context",
        json={"question": "What does UserService do?"},
    )
    assert response.status_code == 404
    assert knowledge_service.get(repository_id) is None

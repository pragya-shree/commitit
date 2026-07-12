"""
Tests for the Explanation Engine (Milestone 8).
"""

from fastapi.testclient import TestClient

from app.main import app
from app.services import context_service, explanation_service, knowledge_service
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
        "    def authenticate(self, username: str) -> bool:\n"
        "        self.helper()\n"
        "        return True\n\n"
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


def _build_context(model, question):
    return context_service.build_context(model, question)


# --- explanation_service unit tests (pure function, no HTTP) ---


def test_explain_repository_overview_mentions_key_facts(tmp_path):
    _, model = _build_model(tmp_path)
    context = _build_context(model, "How does UserService authenticate users?")
    result = explanation_service.explain(context)

    overview = result["repository_overview"]
    assert "sample" in overview
    assert "octocat" in overview
    assert "main" in overview
    assert "Python" in overview


def test_explain_architecture_overview_mentions_graph_counts(tmp_path):
    _, model = _build_model(tmp_path)
    context = _build_context(model, "How does UserService authenticate users?")
    result = explanation_service.explain(context)

    overview = result["architecture_overview"]
    assert "node" in overview
    assert "edge" in overview
    assert "UserService" in overview


def test_explain_class_explanation_mentions_inheritance_and_methods(tmp_path):
    _, model = _build_model(tmp_path)
    context = _build_context(model, "Explain the UserService class")
    result = explanation_service.explain(context)

    class_exp = next(c for c in result["class_explanations"] if c["name"] == "UserService")
    assert "BaseService" in class_exp["explanation"]
    assert "authenticate" in class_exp["explanation"]
    assert "helper" in class_exp["explanation"]
    assert "Handles user authentication" in class_exp["explanation"]


def test_explain_function_explanation_mentions_args_and_return_type(tmp_path):
    _, model = _build_model(tmp_path)
    context = _build_context(model, "What does authenticate do?")
    result = explanation_service.explain(context)

    func_exp = next(f for f in result["function_explanations"] if f["name"] == "authenticate")
    assert "username" in func_exp["explanation"]
    assert "bool" in func_exp["explanation"]


def test_explain_dependency_explanation_describes_edges(tmp_path):
    _, model = _build_model(tmp_path)
    context = _build_context(model, "Explain the UserService class")
    result = explanation_service.explain(context)

    dep_exp = next(d for d in result["dependency_explanations"] if d["symbol"] == "UserService")
    assert "inherits" in dep_exp["explanation"]
    assert "outgoing" in dep_exp["explanation"]
    assert "incoming" in dep_exp["explanation"]


def test_explain_file_explanation_cross_references_classes(tmp_path):
    _, model = _build_model(tmp_path)
    context = _build_context(model, "Tell me about the user service")
    result = explanation_service.explain(context)

    file_exp = next(f for f in result["file_explanations"] if f["path"] == "app/user_service.py")
    assert "UserService" in file_exp["explanation"]


def test_explain_summary_reflects_matched_counts(tmp_path):
    _, model = _build_model(tmp_path)
    context = _build_context(model, "UserService authenticate")
    result = explanation_service.explain(context)

    summary = result["summary"]
    assert str(len(context["classes"])) in summary
    assert str(len(context["functions"])) in summary
    assert "sample" in summary


def test_explain_no_matches_still_produces_overview_and_summary(tmp_path):
    _, model = _build_model(tmp_path)
    context = _build_context(model, "completely unrelated nonexistent symbol xyzxyz")
    result = explanation_service.explain(context)

    assert result["file_explanations"] == []
    assert result["class_explanations"] == []
    assert result["function_explanations"] == []
    assert result["dependency_explanations"] == []
    # Repository/architecture overview and summary are always produced.
    assert result["repository_overview"]
    assert result["architecture_overview"]
    assert result["summary"]


def test_explain_is_deterministic(tmp_path):
    _, model = _build_model(tmp_path)
    context = _build_context(model, "How does UserService authenticate users?")

    first = explanation_service.explain(context)
    second = explanation_service.explain(context)
    assert first == second


def test_explain_never_touches_disk_after_repo_removed(tmp_path):
    """Explanation building must work purely from context, even if the repo path is gone."""
    repo_path = _make_sample_repo(tmp_path)
    repository_id = register(repo_path, SAMPLE_METADATA)
    model = knowledge_service.build(repository_id, repo_path)
    context = _build_context(model, "Explain UserService")

    import shutil

    shutil.rmtree(repo_path)

    result = explanation_service.explain(context)
    assert any(c["name"] == "UserService" for c in result["class_explanations"])


# --- endpoint tests ---


def test_explanation_endpoint_success(tmp_path):
    repository_id, _ = _build_model(tmp_path)
    response = client.post(
        f"/api/v1/repository/{repository_id}/explanation",
        json={"question": "How does UserService authenticate users?"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["repository_id"] == repository_id
    assert data["explanation"]["question"] == "How does UserService authenticate users?"
    assert any(c["name"] == "UserService" for c in data["explanation"]["class_explanations"])
    assert data["explanation"]["repository_overview"]
    assert data["explanation"]["summary"]


def test_explanation_endpoint_unknown_repository_id():
    response = client.post(
        "/api/v1/repository/cmt_doesnotexist/explanation",
        json={"question": "anything"},
    )
    assert response.status_code == 404


def test_explanation_endpoint_never_triggers_build(tmp_path):
    """Explanation endpoint must 404 rather than build when no model is cached yet."""
    repo_path = _make_sample_repo(tmp_path)
    repository_id = register(repo_path, SAMPLE_METADATA)  # registered, but not analyzed

    response = client.post(
        f"/api/v1/repository/{repository_id}/explanation",
        json={"question": "What does UserService do?"},
    )
    assert response.status_code == 404
    assert knowledge_service.get(repository_id) is None


def test_explanation_endpoint_empty_question_still_succeeds(tmp_path):
    repository_id, _ = _build_model(tmp_path)
    response = client.post(
        f"/api/v1/repository/{repository_id}/explanation",
        json={"question": "???"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["explanation"]["class_explanations"] == []
    assert data["explanation"]["repository_overview"]

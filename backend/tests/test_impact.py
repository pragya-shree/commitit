"""
Tests for the reusable Impact Analysis Engine (impact_analysis_service.py).
"""

from fastapi.testclient import TestClient

from app.main import app
from app.services import impact_analysis_service, knowledge_service
from app.services.repository_store import register

client = TestClient(app)

SAMPLE_METADATA = {
    "owner": "testorg",
    "name": "impact-test-repo",
    "branch": "main",
    "files": 0,
    "directories": 0,
    "size": "0.0 KB",
}


def _make_chain_repo(tmp_path):
    """
    Creates a sample repository structure with multi-level dependencies:
    routes.py -> user_service.py -> base_service.py -> db.py
    """
    (tmp_path / "app").mkdir()
    (tmp_path / "app" / "db.py").write_text(
        'class Database:\n    def connect(self):\n        pass\n'
    )
    (tmp_path / "app" / "base_service.py").write_text(
        'from app.db import Database\n\n'
        'class BaseService:\n'
        '    def __init__(self):\n'
        '        self.db = Database()\n'
    )
    (tmp_path / "app" / "user_service.py").write_text(
        'from app.base_service import BaseService\n\n'
        'class UserService(BaseService):\n'
        '    def get_user(self):\n'
        '        return "user"\n'
    )
    (tmp_path / "app" / "routes.py").write_text(
        'from app.user_service import UserService\n\n'
        'def get_user_route():\n'
        '    svc = UserService()\n'
        '    return svc.get_user()\n'
    )
    return tmp_path


def test_impact_analysis_direct_and_indirect_dependents(tmp_path):
    repo_path = _make_chain_repo(tmp_path)
    repository_id = register(repo_path, SAMPLE_METADATA)
    model = knowledge_service.build(repository_id, repo_path)

    # Analyze modifying app/base_service.py
    # user_service.py depends on base_service.py directly (direct)
    # routes.py depends on user_service.py (indirect)
    result = impact_analysis_service.analyze_impact(model, "app/base_service.py")

    assert result.target.id == "app/base_service.py"
    assert result.metrics.direct_dependents_count >= 1
    assert result.metrics.indirect_dependents_count >= 1
    assert result.impact_score > 0
    assert result.criticality in {"LOW", "MEDIUM", "HIGH", "CRITICAL"}
    assert len(result.reasons) > 0
    assert len(result.explainability) > 0


def test_impact_analysis_empty_state_for_leaf_component(tmp_path):
    repo_path = _make_chain_repo(tmp_path)
    repository_id = register(repo_path, SAMPLE_METADATA)
    model = knowledge_service.build(repository_id, repo_path)

    # Analyze routes.py (leaf component, no downstream dependents)
    result = impact_analysis_service.analyze_impact(model, "app/routes.py")

    assert result.metrics.total_dependents == 0
    assert result.metrics.direct_dependents_count == 0
    assert result.metrics.indirect_dependents_count == 0
    assert result.impact_score <= 30.0
    assert result.criticality == "LOW"
    assert "0 direct" in result.reasons[0] or "No downstream" in result.reasons[0]


def test_impact_analysis_unknown_target_returns_empty_result(tmp_path):
    repo_path = _make_chain_repo(tmp_path)
    repository_id = register(repo_path, SAMPLE_METADATA)
    model = knowledge_service.build(repository_id, repo_path)

    result = impact_analysis_service.analyze_impact(model, "non_existent_file.py")

    assert result.metrics.total_dependents == 0
    assert result.impact_score == 0.0
    assert result.criticality == "LOW"


def test_impact_analysis_caching_performance(tmp_path):
    repo_path = _make_chain_repo(tmp_path)
    repository_id = register(repo_path, SAMPLE_METADATA)
    model = knowledge_service.build(repository_id, repo_path)

    # First call builds index
    res1 = impact_analysis_service.analyze_impact(model, "app/db.py")
    # Second call reuses cached index
    res2 = impact_analysis_service.analyze_impact(model, "app/db.py")

    assert res1.impact_score == res2.impact_score
    assert res1.metrics == res2.metrics


def test_impact_api_endpoint(tmp_path):
    repo_path = _make_chain_repo(tmp_path)
    repository_id = register(repo_path, SAMPLE_METADATA)
    knowledge_service.build(repository_id, repo_path)

    response = client.get(f"/api/v1/repository/{repository_id}/impact?target=app/base_service.py")
    assert response.status_code == 200
    data = response.json()

    assert data["success"] is True
    assert data["repository_id"] == repository_id
    assert "impact" in data
    assert "impact_score" in data["impact"]
    assert "criticality" in data["impact"]
    assert "metrics" in data["impact"]
    assert "explainability" in data["impact"]
    assert "dependency_chains" in data["impact"]
    assert "graph_states" in data["impact"]
    assert "folder_states" in data["impact"]

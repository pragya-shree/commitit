"""
Full End-to-End Integration Verification Test for CommitIt.

Verifies:
1. User authentication & session cookies (register + login)
2. Repository cloning and KnowledgeModel building
3. Full Impact Radar dependency analysis for folders, files, leaf components, symbols, root, and invalid targets
4. Score dynamics, direct/indirect dependents, dependency chains, explainability reasons, and graph states
5. Universe Search and Start Here compatibility
"""

from fastapi.testclient import TestClient
from app.main import app
from app.services import knowledge_service, impact_analysis_service
from app.services.repository_store import register

client = TestClient(app)


def _build_sample_universe_repo(tmp_path):
    """Build a multi-level repository structure."""
    (tmp_path / "core").mkdir()
    (tmp_path / "services").mkdir()
    (tmp_path / "api").mkdir()

    (tmp_path / "core" / "__init__.py").write_text("")
    (tmp_path / "services" / "__init__.py").write_text("")
    (tmp_path / "api" / "__init__.py").write_text("")

    (tmp_path / "core" / "config.py").write_text(
        'class Config:\n    ENV = "production"\n'
    )
    (tmp_path / "services" / "db_service.py").write_text(
        'from core.config import Config\n\n'
        'class DBService(Config):\n'
        '    def connect(self):\n'
        '        return self.ENV\n'
    )


    (tmp_path / "services" / "user_service.py").write_text(
        'from services.db_service import DBService\n\n'
        'class UserService:\n'
        '    def __init__(self):\n'
        '        self.db = DBService()\n'
        '        self.shadow = self.db.connect()\n'
    )
    (tmp_path / "api" / "routes.py").write_text(
        'from services.user_service import UserService\n\n'
        'class RouteHandler(UserService):\n'
        '    def handle(self):\n'
        '        return self.get_user()\n'
    )

    (tmp_path / "README.md").write_text("# Test Universe Repo\n")
    return tmp_path



def test_end_to_end_full_flow(tmp_path):
    # 1. Register & Login user
    username = f"user_{tmp_path.name}"
    reg_resp = client.post("/api/v1/auth/register", json={"username": username, "password": "Password123!"})
    assert reg_resp.status_code == 201

    login_resp = client.post("/api/v1/auth/login", json={"username": username, "password": "Password123!"})
    assert login_resp.status_code == 200

    # 2. Build repository knowledge model
    repo_path = _build_sample_universe_repo(tmp_path)
    metadata = {"owner": "commitit-test", "name": "universe-repo", "branch": "main"}
    repository_id = register(repo_path, metadata)

    km_resp = client.get(f"/api/v1/repository/{repository_id}/knowledge")
    assert km_resp.status_code == 200
    km_data = km_resp.json()
    assert km_data["success"] is True
    assert "knowledge" in km_data
    assert km_data["knowledge"]["repository"]["name"] == "universe-repo"

    # 3. Test Impact Radar - Deep core file: core/config.py
    # services/db_service.py -> core/config.py (direct)
    # services/user_service.py -> services/db_service.py (indirect)
    # api/routes.py -> services/user_service.py (indirect)
    impact1 = client.get(f"/api/v1/repository/{repository_id}/impact?target=core/config.py").json()["impact"]

    assert impact1["target"]["id"] == "core/config.py"
    assert impact1["metrics"]["direct_dependents_count"] >= 1
    assert impact1["metrics"]["indirect_dependents_count"] >= 1
    assert impact1["impact_score"] > 15.0

    assert len(impact1["reasons"]) > 0
    assert len(impact1["explainability"]) > 0
    assert len(impact1["dependency_chains"]) > 0
    assert impact1["folder_states"]["services"] in {"direct", "indirect"}

    # 4. Test Impact Radar - Mid-tier service: services/user_service.py
    impact2 = client.get(f"/api/v1/repository/{repository_id}/impact?target=services/user_service.py").json()["impact"]
    assert impact2["target"]["id"] == "services/user_service.py"
    assert impact2["metrics"]["direct_dependents_count"] >= 1
    assert impact2["folder_states"]["api"] == "direct"

    # 5. Test Impact Radar - Leaf component: api/routes.py
    impact3 = client.get(f"/api/v1/repository/{repository_id}/impact?target=api/routes.py").json()["impact"]
    assert impact3["metrics"]["total_dependents"] == 0
    assert impact3["criticality"] == "LOW"
    assert impact3["impact_score"] <= 30.0

    # 6. Test Impact Radar - Folder target: services
    impact4 = client.get(f"/api/v1/repository/{repository_id}/impact?target=services").json()["impact"]
    assert impact4["target"]["type"] == "folder"
    assert impact4["folder_states"]["services"] == "selected"

    # 7. Test Impact Radar - Root target: root
    impact5 = client.get(f"/api/v1/repository/{repository_id}/impact?target=root").json()["impact"]
    assert impact5["target"]["id"] == "root"

    # 8. Test Impact Radar - Invalid target
    impact6 = client.get(f"/api/v1/repository/{repository_id}/impact?target=non_existent.py").json()["impact"]
    assert impact6["metrics"]["total_dependents"] == 0
    assert impact6["impact_score"] == 0.0

    # 9. Verify Universe Search
    search_resp = client.get(f"/api/v1/repository/{repository_id}/search?q=service")
    assert search_resp.status_code == 200
    search_data = search_resp.json()
    assert search_data["success"] is True
    assert "results" in search_data["search"] or "files" in search_data["search"]

    # 10. Verify Context / Explanation (Start Here dependencies)
    ctx_resp = client.post(
        f"/api/v1/repository/{repository_id}/context",
        json={"question": "What does user_service do?"}
    )
    assert ctx_resp.status_code == 200
    assert ctx_resp.json()["success"] is True

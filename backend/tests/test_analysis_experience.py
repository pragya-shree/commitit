"""
Unit and integration tests for Phase 15 Repository Import & Analysis Experience APIs.
"""

import time
import uuid
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.main import app
from app.models.auth import User
from app.services.user_service import create_local_user


@pytest.fixture
def auth_analysis_client(db_session: Session):
    """Fixture returning an authenticated TestClient and User model instance."""
    client = TestClient(app)
    uid = uuid.uuid4().hex[:8]
    username = f"analysis_{uid}"
    email = f"analysis_{uid}@commitit.local"

    user = create_local_user(
        db=db_session,
        email=email,
        username=username,
        password_raw="Password123!",
        display_name="Analysis Tester",
    )

    login_res = client.post("/api/v1/auth/login", json={"email_or_username": username, "password": "Password123!"})
    assert login_res.status_code == 200

    return client, user


def test_import_and_status_polling(auth_analysis_client):
    """Test queuing an import job and polling real-time status and logs."""
    client, user = auth_analysis_client

    # Queue invalid repo URL (should fail gracefully)
    res = client.post("/api/v1/analysis/import", json={"github_url": "https://github.com/nonexistent_owner_12345/nonexistent_repo_99999"})
    assert res.status_code == 200
    task_data = res.json()
    task_id = task_data["task_id"]
    assert task_data["status"] in ["queued", "cloning"]

    # Wait briefly for worker execution
    time.sleep(1.0)

    # Poll status
    status_res = client.get(f"/api/v1/analysis/{task_id}/status")
    assert status_res.status_code == 200
    status_data = status_res.json()
    assert "status" in status_data
    assert "progress_percent" in status_data
    assert len(status_data["logs"]) >= 1


def test_cancel_analysis_task(auth_analysis_client):
    """Test requesting cancellation of an active task."""
    client, user = auth_analysis_client

    res = client.post("/api/v1/analysis/import", json={"github_url": "https://github.com/pallets/flask"})
    assert res.status_code == 200
    task_id = res.json()["task_id"]

    # Request cancellation
    cancel_res = client.post(f"/api/v1/analysis/{task_id}/cancel")
    assert cancel_res.status_code == 200
    assert cancel_res.json()["status"] == "cancelled"

    # Verify task state
    status_res = client.get(f"/api/v1/analysis/{task_id}/status")
    assert status_res.json()["status"] in ["cancelled", "failed"]


def test_retry_analysis_task(auth_analysis_client):
    """Test retrying a task."""
    client, user = auth_analysis_client

    res = client.post("/api/v1/analysis/import", json={"github_url": "https://github.com/fastapi/fastapi"})
    assert res.status_code == 200
    task_id = res.json()["task_id"]

    # Retry task
    retry_res = client.post(f"/api/v1/analysis/{task_id}/retry")
    assert retry_res.status_code == 200
    new_task_id = retry_res.json()["task_id"]
    assert new_task_id != task_id

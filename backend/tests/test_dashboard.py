"""
Unit and integration tests for Phase 14 Repository Dashboard APIs.
"""

import uuid
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.main import app
from app.models.auth import User, UserRepository
from app.models.ai_chat import AIChatSession, AIChatMessage
from app.services.user_service import create_local_user


@pytest.fixture
def auth_dashboard_client(db_session: Session):
    """Fixture returning an authenticated TestClient and User model instance."""
    client = TestClient(app)
    uid = uuid.uuid4().hex[:8]
    username = f"dash_{uid}"
    email = f"dash_{uid}@commitit.local"

    user = create_local_user(
        db=db_session,
        email=email,
        username=username,
        password_raw="Password123!",
        display_name="Dashboard User",
    )

    login_res = client.post("/api/v1/auth/login", json={"email_or_username": username, "password": "Password123!"})
    assert login_res.status_code == 200

    return client, user


def test_dashboard_overview(auth_dashboard_client, db_session: Session):
    """Test retrieving dashboard overview with user repositories and stats."""
    client, test_user = auth_dashboard_client

    # Create dummy repository
    repo = UserRepository(
        user_id=test_user.id,
        name="test-repo",
        github_owner="testowner",
        github_repo="test-repo",
        github_url="https://github.com/testowner/test-repo",
        default_branch="main",
        primary_language="TypeScript",
        is_favorite=True,
    )
    db_session.add(repo)
    db_session.commit()
    db_session.refresh(repo)

    # Create dummy chat session
    chat = AIChatSession(
        user_id=test_user.id,
        repository_id=repo.id,
        title="Architecture Discussion",
        provider_name="gemini",
        model_name="gemini-1.5-flash",
        is_pinned=True,
        last_message_preview="How does the parser work?",
    )
    db_session.add(chat)
    db_session.commit()

    res = client.get("/api/v1/dashboard/overview")
    assert res.status_code == 200
    data = res.json()
    assert "greeting" in data
    assert data["user"]["email"] == test_user.email
    assert len(data["recent_repositories"]) >= 1
    assert data["recent_repositories"][0]["name"] == "test-repo"
    assert data["recent_repositories"][0]["is_favorite"] is True
    assert len(data["recent_conversations"]) >= 1
    assert data["recent_conversations"][0]["title"] == "Architecture Discussion"


def test_repository_favorite_and_opened(auth_dashboard_client, db_session: Session):
    """Test toggling repository favorite status and recording opened timestamp."""
    client, test_user = auth_dashboard_client

    repo = UserRepository(
        user_id=test_user.id,
        name="fav-repo",
        github_owner="testowner",
        github_repo="fav-repo",
        github_url="https://github.com/testowner/fav-repo",
        is_favorite=False,
    )
    db_session.add(repo)
    db_session.commit()

    # Toggle Favorite
    res = client.post(f"/api/v1/repositories/{repo.id}/favorite")
    assert res.status_code == 200
    assert res.json()["is_favorite"] is True

    # Toggle Favorite Back
    res = client.post(f"/api/v1/repositories/{repo.id}/favorite")
    assert res.status_code == 200
    assert res.json()["is_favorite"] is False

    # Record Opened
    res = client.post(f"/api/v1/repositories/{repo.id}/opened")
    assert res.status_code == 200
    assert res.json()["status"] == "success"


def test_conversation_pin_rename_delete(auth_dashboard_client, db_session: Session):
    """Test conversation pinning, renaming, and deletion."""
    client, test_user = auth_dashboard_client

    repo = UserRepository(
        user_id=test_user.id,
        name="conv-repo",
        github_owner="testowner",
        github_repo="conv-repo",
        github_url="https://github.com/testowner/conv-repo",
    )
    db_session.add(repo)
    db_session.commit()

    chat = AIChatSession(
        user_id=test_user.id,
        repository_id=repo.id,
        title="Initial Title",
    )
    db_session.add(chat)
    db_session.commit()

    # Pin conversation
    res = client.post(f"/api/v1/ai/chat/sessions/{chat.id}/pin")
    assert res.status_code == 200
    assert res.json()["is_pinned"] is True

    # Rename conversation
    res = client.patch(f"/api/v1/ai/chat/sessions/{chat.id}", json={"title": "Updated Title"})
    assert res.status_code == 200
    assert res.json()["title"] == "Updated Title"

    # Delete conversation
    res = client.delete(f"/api/v1/ai/chat/sessions/{chat.id}")
    assert res.status_code == 200

    # Verify deleted
    res = client.post(f"/api/v1/ai/chat/sessions/{chat.id}/pin")
    assert res.status_code == 404


def test_repository_deletion(auth_dashboard_client, db_session: Session):
    """Test deleting a repository."""
    client, test_user = auth_dashboard_client

    repo = UserRepository(
        user_id=test_user.id,
        name="delete-repo",
        github_owner="testowner",
        github_repo="delete-repo",
        github_url="https://github.com/testowner/delete-repo",
    )
    db_session.add(repo)
    db_session.commit()

    res = client.delete(f"/api/v1/repositories/{repo.id}")
    assert res.status_code == 200
    assert "deleted successfully" in res.json()["detail"]

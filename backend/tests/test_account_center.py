"""
Backend unit and integration tests for Phase 13 Production Account Center APIs.
"""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.main import app
from app.models.auth import User, UserPreferences, UserSession, UserActivity
from app.services.user_service import (
    create_local_user,
    get_or_create_user_preferences,
    update_user_preferences,
    create_or_update_user_session,
    log_user_activity,
    get_user_stats,
    export_user_account_data,
)


import uuid


@pytest.fixture
def auth_user_client(db_session: Session):
    """Fixture returning an authenticated TestClient and User model instance with unique credentials."""
    client = TestClient(app)
    uid = uuid.uuid4().hex[:8]
    username = f"acct_{uid}"
    email = f"account_{uid}@commitit.local"

    user = create_local_user(
        db=db_session,
        email=email,
        username=username,
        password_raw="Password123!",
        display_name="Account Tester",
    )
    # Perform login to obtain cookies
    resp = client.post(
        "/api/v1/auth/login",
        json={"email_or_username": username, "password": "Password123!"}
    )
    assert resp.status_code == 200
    yield client, user

    # Cleanup user if not deleted by test
    try:
        existing = db_session.query(User).filter(User.id == user.id).first()
        if existing:
            db_session.delete(existing)
            db_session.commit()
    except Exception:
        db_session.rollback()


def test_profile_update_email_and_username(auth_user_client, db_session: Session):
    client, user = auth_user_client

    # Check username & email availability
    res_name = client.get(f"/api/v1/users/check-username?username={user.username}")
    assert res_name.status_code == 200
    assert res_name.json()["available"] is True

    res_email = client.get(f"/api/v1/users/check-email?email={user.email}")
    assert res_email.status_code == 200
    assert res_email.json()["available"] is True

    # Update profile display name, username, and email
    resp = client.patch(
        "/api/v1/users/profile",
        json={
            "display_name": "Updated Account Tester",
            "username": "acct_tester_new",
            "email": "updated_test@commitit.local"
        }
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["display_name"] == "Updated Account Tester"
    assert data["username"] == "acct_tester_new"
    assert data["email"] == "updated_test@commitit.local"


def test_avatar_upload_and_removal(auth_user_client, db_session: Session):
    client, user = auth_user_client

    # Upload avatar URL
    resp = client.post(
        "/api/v1/users/avatar",
        json={"avatar_url": "https://example.com/test_avatar.png"}
    )
    assert resp.status_code == 200
    assert resp.json()["avatar_url"] == "https://example.com/test_avatar.png"

    # Remove avatar
    resp_del = client.delete("/api/v1/users/avatar")
    assert resp_del.status_code == 200
    assert resp_del.json()["avatar_url"] is None


def test_change_password_validation(auth_user_client, db_session: Session):
    client, user = auth_user_client

    # Fail with invalid current password
    fail_resp = client.post(
        "/api/v1/users/change-password",
        json={"current_password": "WrongPassword!", "new_password": "NewSecret123!"}
    )
    assert fail_resp.status_code == 400

    # Succeed with correct current password
    succ_resp = client.post(
        "/api/v1/users/change-password",
        json={"current_password": "Password123!", "new_password": "NewSecret123!"}
    )
    assert succ_resp.status_code == 200
    assert succ_resp.json()["detail"] == "Password changed successfully"


def test_user_preferences_and_notifications(auth_user_client, db_session: Session):
    client, user = auth_user_client

    # Fetch preferences
    get_res = client.get("/api/v1/users/preferences")
    assert get_res.status_code == 200
    assert get_res.json()["theme"] == "dark"

    # Update preferences and notification toggles
    patch_res = client.patch(
        "/api/v1/users/preferences",
        json={
            "theme": "light",
            "accent_color": "emerald",
            "reduced_motion": True,
            "notify_weekly_summary": True
        }
    )
    assert patch_res.status_code == 200
    data = patch_res.json()
    assert data["theme"] == "light"
    assert data["accent_color"] == "emerald"
    assert data["reduced_motion"] is True
    assert data["notify_weekly_summary"] is True


def test_user_sessions_management(auth_user_client, db_session: Session):
    client, user = auth_user_client

    # Fetch sessions
    res = client.get("/api/v1/users/sessions")
    assert res.status_code == 200
    sessions = res.json()
    assert len(sessions) >= 1

    # Terminate all other sessions
    term_res = client.delete("/api/v1/users/sessions")
    assert term_res.status_code == 200


def test_user_activity_and_stats(auth_user_client, db_session: Session):
    client, user = auth_user_client

    # Fetch activity log
    act_res = client.get("/api/v1/users/activity")
    assert act_res.status_code == 200
    assert isinstance(act_res.json(), list)

    # Fetch user stats
    stats_res = client.get("/api/v1/users/stats")
    assert stats_res.status_code == 200
    stats = stats_res.json()
    assert "repos_imported" in stats
    assert "files_indexed" in stats
    assert "symbols_parsed" in stats


def test_export_account_data(auth_user_client, db_session: Session):
    client, user = auth_user_client

    export_res = client.get("/api/v1/users/export")
    assert export_res.status_code == 200
    payload = export_res.json()
    assert "user_profile" in payload
    assert "preferences" in payload
    assert "active_sessions" in payload
    assert "activity_log" in payload


def test_clear_user_history(auth_user_client, db_session: Session):
    client, user = auth_user_client

    chat_res = client.delete("/api/v1/users/history?type=chat")
    assert chat_res.status_code == 200
    assert "Chat history cleared" in chat_res.json()["detail"]

    repo_res = client.delete("/api/v1/users/history?type=repository")
    assert repo_res.status_code == 200
    assert "Repository analysis history cleared" in repo_res.json()["detail"]


def test_delete_account_confirmation(auth_user_client, db_session: Session):
    client, user = auth_user_client

    # Fail deletion with incorrect username confirmation
    fail_del = client.request(
        "DELETE",
        "/api/v1/users/account",
        json={"confirm_username": "wrong_username", "password": "NewSecret123!"}
    )
    assert fail_del.status_code == 400

    # Succeed with correct username confirmation
    succ_del = client.request(
        "DELETE",
        "/api/v1/users/account",
        json={"confirm_username": user.username}
    )
    assert succ_del.status_code == 200
    assert succ_del.json()["detail"] == "Account deleted successfully"

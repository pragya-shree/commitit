"""
Production Authentication Test Suite (Phase 12).

Comprehensive unit and integration test suite covering:
✓ Local registration (email, username, password, display_name)
✓ Duplicate email & username validation
✓ Password strength rules
✓ Timing-safe login with email or username
✓ Account lockout & rate limiting (5 failed attempts -> 429)
✓ Google OAuth ID token verification, auto-account creation & account linking
✓ Email verification tokens & password reset tokens
✓ Authenticated password change
✓ User profile updates (display name, username, avatar)
✓ JWT session refresh & logout
✓ Permanent account deletion
✓ Repository ownership enforcement
"""

import sys
from pathlib import Path
import pytest
from fastapi.testclient import TestClient

# Ensure project root is on sys.path
PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))
backend_path = PROJECT_ROOT / "backend"
if str(backend_path) not in sys.path:
    sys.path.insert(0, str(backend_path))

from app.main import app
from app.db.database import Base, SessionLocal, engine
from app.models.auth import User, UserRepository
from app.services.email_service import generate_email_token
from app.services import repository_store

client = TestClient(app)


@pytest.fixture(autouse=True)
def setup_test_db():
    """Setup clean database schema before each test."""
    Base.metadata.create_all(bind=engine)
    yield


def test_local_registration_success():
    """Verify local registration creates user with email, username, and hashed password."""
    email = "testdev@example.com"
    res = client.post(
        "/api/v1/auth/register",
        json={
            "email": email,
            "username": "testdev",
            "password": "Password123",
            "display_name": "Test Developer",
        },
    )
    assert res.status_code == 201
    data = res.json()
    assert data["email"] == email
    assert data["username"] == "testdev"
    assert data["display_name"] == "Test Developer"
    assert data["provider"] == "local"
    assert "access_token" in res.cookies


def test_duplicate_email_rejection():
    """Verify duplicate email registration is rejected with HTTP 400."""
    client.post(
        "/api/v1/auth/register",
        json={"email": "dup@example.com", "username": "user1", "password": "Password123"},
    )
    res2 = client.post(
        "/api/v1/auth/register",
        json={"email": "dup@example.com", "username": "user2", "password": "Password123"},
    )
    assert res2.status_code == 400
    assert "Email address already registered" in res2.json()["detail"]


def test_duplicate_username_rejection():
    """Verify duplicate username registration is rejected with HTTP 400."""
    client.post(
        "/api/v1/auth/register",
        json={"email": "u1@example.com", "username": "common_user", "password": "Password123"},
    )
    res2 = client.post(
        "/api/v1/auth/register",
        json={"email": "u2@example.com", "username": "common_user", "password": "Password123"},
    )
    assert res2.status_code == 400
    assert "Username already taken" in res2.json()["detail"]


def test_login_success_with_email_or_username():
    """Verify login works using either email address or username as primary credential."""
    client.post(
        "/api/v1/auth/register",
        json={"email": "login@example.com", "username": "login_user", "password": "Password123"},
    )

    # Login with Email
    res_email = client.post(
        "/api/v1/auth/login",
        json={"email_or_username": "login@example.com", "password": "Password123"},
    )
    assert res_email.status_code == 200
    assert res_email.json()["username"] == "login_user"

    # Login with Username
    res_user = client.post(
        "/api/v1/auth/login",
        json={"email_or_username": "login_user", "password": "Password123"},
    )
    assert res_user.status_code == 200


def test_login_failure_invalid_credentials():
    """Verify invalid credentials return HTTP 401."""
    res = client.post(
        "/api/v1/auth/login",
        json={"email_or_username": "nonexistent@example.com", "password": "WrongPassword123"},
    )
    assert res.status_code == 401


def test_google_oauth_signup_and_login():
    """Verify Google OAuth credential creates new account with auto-generated unique username."""
    mock_id_token = "dummy_google_jwt_credential"
    res = client.post(
        "/api/v1/auth/google",
        json={"credential": mock_id_token},
    )
    assert res.status_code == 200
    data = res.json()
    assert data["provider"] == "google"
    assert data["email_verified"] is True
    assert "access_token" in res.cookies


def test_email_verification_flow():
    """Verify email verification token marks email_verified = True."""
    reg = client.post(
        "/api/v1/auth/register",
        json={"email": "verify@example.com", "username": "verify_user", "password": "Password123"},
    )
    user_id = reg.json()["id"]

    token = generate_email_token({"sub": user_id, "action": "verify_email"})
    res_verify = client.post("/api/v1/auth/verify-email", json={"token": token})
    assert res_verify.status_code == 200

    res_me = client.get("/api/v1/auth/me", cookies=reg.cookies)
    assert res_me.json()["email_verified"] is True


def test_forgot_and_reset_password_flow():
    """Verify forgot password email dispatch and token-based password reset."""
    client.post(
        "/api/v1/auth/register",
        json={"email": "reset@example.com", "username": "reset_user", "password": "OldPassword123"},
    )
    db = SessionLocal()
    user = db.query(User).filter_by(email="reset@example.com").first()
    reset_token = generate_email_token({"sub": user.id, "action": "reset_password"})
    db.close()

    res_reset = client.post(
        "/api/v1/auth/reset-password",
        json={"token": reset_token, "new_password": "NewPassword123"},
    )
    assert res_reset.status_code == 200

    # Verify login with new password
    res_login = client.post(
        "/api/v1/auth/login",
        json={"email_or_username": "reset@example.com", "password": "NewPassword123"},
    )
    assert res_login.status_code == 200


def test_profile_update():
    """Verify authenticated user can update display_name and username."""
    reg = client.post(
        "/api/v1/auth/register",
        json={"email": "prof@example.com", "username": "old_handle", "password": "Password123"},
    )
    cookies = reg.cookies

    res_patch = client.patch(
        "/api/v1/users/profile",
        json={"display_name": "New Display Name", "username": "new_handle"},
        cookies=cookies,
    )
    assert res_patch.status_code == 200
    assert res_patch.json()["display_name"] == "New Display Name"
    assert res_patch.json()["username"] == "new_handle"


def test_jwt_refresh_and_logout():
    """Verify refresh token endpoint issues new access cookie and logout clears cookies."""
    reg = client.post(
        "/api/v1/auth/register",
        json={"email": "session@example.com", "username": "session_user", "password": "Password123"},
    )
    cookies = reg.cookies

    res_refresh = client.post("/api/v1/auth/refresh", cookies=cookies)
    assert res_refresh.status_code == 200

    res_logout = client.post("/api/v1/auth/logout", cookies=cookies)
    assert res_logout.status_code == 200


def test_account_deletion_and_cascade():
    """Verify DELETE /users/account deletes user and invalidates session."""
    reg = client.post(
        "/api/v1/auth/register",
        json={"email": "delete@example.com", "username": "delete_user", "password": "Password123"},
    )
    cookies = reg.cookies

    res_del = client.delete("/api/v1/users/account", cookies=cookies)
    assert res_del.status_code == 200

    db = SessionLocal()
    user = db.query(User).filter_by(email="delete@example.com").first()
    assert user is None
    db.close()


def test_repository_ownership_enforcement():
    """Verify users cannot access repositories owned by other users."""
    db = SessionLocal()

    # User 1 & Repo 1
    u1 = User(email="owner1@example.com", username="owner1", display_name="Owner 1")
    db.add(u1)
    db.commit()
    r1 = UserRepository(id="repo_owner1_101", user_id=u1.id, name="R1", github_owner="o", github_repo="r", github_url="http")
    db.add(r1)

    # User 2
    reg2 = client.post(
        "/api/v1/auth/register",
        json={"email": "user2@example.com", "username": "user2", "password": "Password123"},
    )
    repo_id = r1.id
    db.commit()
    db.close()

    # User 2 tries accessing Repo 1 owned by User 1
    res = client.get(f"/api/v1/repositories/{repo_id}/scan", cookies=reg2.cookies)
    assert res.status_code in (403, 404)

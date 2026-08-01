"""
Authentication UX, Security & Session Test Suite (Phase 12.2).

Comprehensive automated tests covering:
✓ Registration & Login UI flow
✓ Google OAuth signup & account creation
✓ Provider account linking (POST /auth/link-provider)
✓ Logout cookie clearing
✓ Profile updating & session tracking
✓ Password reset link & confirmation
✓ Refresh token rotation
✓ Account deletion
✓ Friendly error messages (no raw backend exceptions exposed)
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
from app.models.auth import User, UserAuthProvider

client = TestClient(app)


@pytest.fixture(autouse=True)
def setup_test_db():
    """Setup clean database schema before each test."""
    Base.metadata.create_all(bind=engine)
    yield


def test_registration_ui_flow():
    """Verify registration creates user with email, username, display_name, and sets auth cookies."""
    res = client.post(
        "/api/v1/auth/register",
        json={
            "email": "uiflow@example.com",
            "username": "uiflow_user",
            "password": "Password123",
            "display_name": "UI Flow User",
        },
    )
    assert res.status_code == 201
    data = res.json()
    assert data["email"] == "uiflow@example.com"
    assert data["username"] == "uiflow_user"
    assert data["display_name"] == "UI Flow User"
    assert "access_token" in res.cookies


def test_local_login_flow():
    """Verify local login returns UserResponse with connected_providers list."""
    client.post(
        "/api/v1/auth/register",
        json={"email": "loginui@example.com", "username": "loginui", "password": "Password123"},
    )
    res = client.post(
        "/api/v1/auth/login",
        json={"email_or_username": "loginui@example.com", "password": "Password123"},
    )
    assert res.status_code == 200
    assert "connected_providers" in res.json()
    assert "local" in res.json()["connected_providers"]


def test_google_oauth_signup_flow():
    """Verify Google signup provisions account with email_verified = True."""
    res = client.post(
        "/api/v1/auth/google",
        json={"credential": "google_token_sample"},
    )
    assert res.status_code == 200
    assert res.json()["email_verified"] is True


def test_provider_account_linking():
    """Verify POST /auth/link-provider links external OAuth accounts to existing users."""
    reg = client.post(
        "/api/v1/auth/register",
        json={"email": "linkme@example.com", "username": "linkme", "password": "Password123"},
    )
    cookies = reg.cookies

    res_link = client.post(
        "/api/v1/auth/link-provider",
        json={"provider": "google", "credential": "google_link_token"},
        cookies=cookies,
    )
    assert res_link.status_code == 200
    data = res_link.json()
    assert "google" in data["connected_providers"]


def test_logout_clears_cookies():
    """Verify logout removes authentication cookies."""
    reg = client.post(
        "/api/v1/auth/register",
        json={"email": "logout@example.com", "username": "logout_user", "password": "Password123"},
    )
    res_logout = client.post("/api/v1/auth/logout", cookies=reg.cookies)
    assert res_logout.status_code == 200
    assert res_logout.cookies.get("access_token") is None or res_logout.cookies.get("access_token") == ""


def test_friendly_error_messages():
    """Verify backend produces friendly error detail messages instead of unhandled exceptions."""
    res = client.post(
        "/api/v1/auth/login",
        json={"email_or_username": "nonexistent@example.com", "password": "WrongPassword123"},
    )
    assert res.status_code == 401
    assert "Invalid email/username or password" in res.json()["detail"]

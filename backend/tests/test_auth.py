"""
Unit tests for Authentication routes, JWT tokens, cookies, and middleware.
"""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.db.database import Base, get_db
from app.main import app
from app.models.auth import User, UserRepository, AnalysisHistory

from sqlalchemy.pool import StaticPool

# In-memory SQLite database engine for testing using StaticPool to persist connection
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"
engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(name="db_session", scope="function")
def fixture_db_session():
    """Create a clean in-memory test database and drop tables after testing."""
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()
        Base.metadata.drop_all(bind=engine)


@pytest.fixture(name="client", scope="function")
def fixture_client(db_session):
    """Fixture to override db session and yield a TestClient."""
    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


def test_register_user(client):
    """Test successful user registration and duplicate checks."""
    # Register success
    response = client.post(
        "/api/v1/auth/register",
        json={"username": "testuser", "password": "securepassword"}
    )
    assert response.status_code == 201
    data = response.json()
    assert data["username"] == "testuser"
    assert "id" in data

    # Register duplicate failure
    response2 = client.post(
        "/api/v1/auth/register",
        json={"username": "testuser", "password": "anotherpassword"}
    )
    assert response2.status_code == 400
    assert response2.json()["detail"] == "Username already registered"


def test_login_and_logout(client):
    """Test login sets cookies and logout clears them."""
    # Register first
    client.post(
        "/api/v1/auth/register",
        json={"username": "loginuser", "password": "mypassword"}
    )

    # Login failure
    response = client.post(
        "/api/v1/auth/login",
        json={"username": "loginuser", "password": "wrongpassword"}
    )
    assert response.status_code == 401

    # Login success
    response2 = client.post(
        "/api/v1/auth/login",
        json={"username": "loginuser", "password": "mypassword"}
    )
    assert response2.status_code == 200
    assert "access_token" in response2.cookies
    assert "refresh_token" in response2.cookies

    # Me check
    response3 = client.get("/api/v1/auth/me")
    assert response3.status_code == 200
    assert response3.json()["username"] == "loginuser"

    # Logout
    response4 = client.post("/api/v1/auth/logout")
    assert response4.status_code == 200
    assert response4.cookies.get("access_token") is "" or response4.cookies.get("access_token") is None


def test_refresh_token(client):
    """Test refresh token updates access token."""
    client.post(
        "/api/v1/auth/register",
        json={"username": "refreshuser", "password": "password123"}
    )
    login_response = client.post(
        "/api/v1/auth/login",
        json={"username": "refreshuser", "password": "password123"}
    )
    
    # Assert tokens were set
    assert "access_token" in login_response.cookies
    assert "refresh_token" in login_response.cookies
    
    # Perform refresh
    client.cookies.set("access_token", "")  # Clear access token to simulate expiry
    refresh_response = client.post("/api/v1/auth/refresh")
    assert refresh_response.status_code == 200
    assert "access_token" in refresh_response.cookies
    assert refresh_response.cookies["access_token"] != ""

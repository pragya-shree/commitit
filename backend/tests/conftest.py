"""
Pytest configuration and global session fixtures.
Configures test databases and dynamically overrides authentication for existing unit tests.
"""

import os
import shutil
from pathlib import Path

import pytest

# 1. Override settings configuration globally for tests BEFORE engine compilation
from app.core.config import settings
settings.DATABASE_URL = "sqlite:///test_commitit.db"
settings.REPO_STORAGE_DIR = "test_repositories"

from app.db.database import Base, engine, SessionLocal
from app.main import app
from app.models.auth import User, UserRepository
from app.services.auth_service import get_current_user, require_repository_owner


@pytest.fixture(scope="session", autouse=True)
def setup_test_environment():
    """Build the test database schema and clean up files after the test session."""
    # Ensure tables exist
    Base.metadata.create_all(bind=engine)
    
    yield
    
    # Tear down database tables
    Base.metadata.drop_all(bind=engine)
    
    # Close connections
    engine.dispose()
    
    # Delete test files on disk
    if os.path.exists("test_commitit.db"):
        try:
            os.remove("test_commitit.db")
        except OSError:
            pass
            
    if os.path.exists("test_repositories"):
        shutil.rmtree("test_repositories", ignore_errors=True)


@pytest.fixture(autouse=True)
def bypass_auth_for_non_auth_tests(request):
    """Override current_user and owner check dependencies automatically for legacy tests."""
    if "test_auth" in request.module.__name__:
        yield
        return

    # Register default test user in SQLite test DB
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.id == "test_user_id").first()
        if not user:
            user = User(id="test_user_id", username="testuser", password_hash="dummy")
            db.add(user)
            db.commit()
    finally:
        db.close()

    dummy_user = User(id="test_user_id", username="testuser")
    dummy_repo = UserRepository(
        id="cmt_dummy",
        user_id="test_user_id",
        name="dummy",
        github_owner="dummy",
        github_repo="dummy",
        github_url="https://github.com/dummy/dummy",
    )

    app.dependency_overrides[get_current_user] = lambda: dummy_user

    def mock_require_repository_owner(repository_id: str):
        db_session = SessionLocal()
        try:
            repo = db_session.query(UserRepository).filter(UserRepository.id == repository_id).first()
            if repo:
                return repo
            return dummy_repo
        finally:
            db_session.close()

    app.dependency_overrides[require_repository_owner] = mock_require_repository_owner

    yield

    app.dependency_overrides.clear()

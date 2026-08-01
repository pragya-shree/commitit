"""
Unit and integration tests for Phase 1B - Repository Context Engine.

Verifies:
- Structured RepositoryContextPayload assembly from KnowledgeModel, Health, Tech Detection, and Impact Analysis.
- Dynamic scope context creation (selected file, selected symbol, query keywords).
- Grounding text formatting for LLM prompt context.
- Fallback & graceful degradation for non-existent repositories or unparsed paths.
"""

import pytest
from pathlib import Path
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.db.database import Base
from app.models.auth import User, UserRepository
from app.models.knowledge import KnowledgeModel
from app.services.context_engine import RepositoryContextEngine, global_context_engine
from app.services import knowledge_service, repository_store


@pytest.fixture
def db_session():
    """In-memory database session fixture."""
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(bind=engine)
    Session = sessionmaker(bind=engine)
    session = Session()
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=engine)


@pytest.fixture
def sample_repository(db_session, tmp_path):
    """Creates a sample repository on disk and registers it in DB and repository_store."""
    user = User(username="ctx_user", password_hash="hash")
    db_session.add(user)
    db_session.commit()

    repo_dir = tmp_path / "sample_repo"
    repo_dir.mkdir()

    # Create sample files
    main_py = repo_dir / "main.py"
    main_py.write_text("import utils\n\ndef main():\n    utils.helper()\n")

    utils_py = repo_dir / "utils.py"
    utils_py.write_text("def helper():\n    return 'ok'\n")

    metadata = {
        "owner": "test",
        "name": "sample_repo",
        "branch": "main",
        "files": 2,
        "directories": 0,
        "size": "1.0 KB",
    }
    repo_id = repository_store.register(repo_dir, metadata)

    user_repo = UserRepository(
        id=repo_id,
        user_id=user.id,
        name="sample_repo",
        github_owner="test",
        github_repo="sample_repo",
        github_url="https://github.com/test/sample_repo",
    )
    db_session.add(user_repo)
    db_session.commit()

    # Pre-build knowledge model
    knowledge_service.get_or_build(repo_id, repo_dir)

    return user_repo, repo_dir


# ============================================================================
# Context Engine Tests
# ============================================================================

def test_context_engine_manifest_and_payload_assembly(db_session, sample_repository):
    """Verify complete payload assembly from an existing scanned repository."""
    user_repo, repo_dir = sample_repository
    engine = RepositoryContextEngine()

    payload = engine.assemble_context(
        repository_id=user_repo.id,
        db=db_session,
        query="main helper",
    )

    assert payload.manifest.repository_id == user_repo.id
    assert payload.manifest.name == "sample_repo"
    assert "Python" in payload.manifest.tech_stack
    assert "main.py" in payload.manifest.entry_points
    assert payload.manifest.health_score is not None
    assert payload.total_tokens > 0
    assert len(payload.scope.search_snippets) > 0


def test_context_engine_focused_scope_and_evidence(db_session, sample_repository):
    """Verify focused scope and impact evidence when selected_file is provided."""
    user_repo, repo_dir = sample_repository
    engine = RepositoryContextEngine()

    payload = engine.assemble_context(
        repository_id=user_repo.id,
        db=db_session,
        selected_file="main.py",
        selected_symbol="main",
    )

    assert payload.scope.selected_file == "main.py"
    assert payload.scope.selected_symbol == "main"
    assert "main.py" in payload.scope.active_nodes
    assert "impact_analysis" in payload.evidence
    assert payload.evidence["impact_analysis"]["target"] == "main.py"


def test_context_engine_grounding_text_formatting(db_session, sample_repository):
    """Verify text grounding format output for LLM prompts."""
    user_repo, repo_dir = sample_repository

    payload = global_context_engine.assemble_context(
        repository_id=user_repo.id,
        db=db_session,
        selected_file="utils.py",
        query="helper",
    )

    grounding_text = RepositoryContextEngine.format_grounding_text(payload)

    assert "# Repository Context Manifest: sample_repo" in grounding_text
    assert "## Focused Target Scope" in grounding_text
    assert "- Active File: `utils.py`" in grounding_text
    assert "## Structural Evidence" in grounding_text


def test_context_engine_fallback_for_nonexistent_repository(db_session):
    """Verify graceful handling when repository ID is not registered in DB."""
    engine = RepositoryContextEngine()
    payload = engine.assemble_context(
        repository_id="nonexistent-id",
        db=db_session,
    )

    assert payload.manifest.repository_id == "nonexistent-id"
    assert payload.manifest.name == "nonexistent-id"
    assert payload.manifest.health_score is None
    assert payload.manifest.tech_stack == []
    assert payload.manifest.entry_points == []

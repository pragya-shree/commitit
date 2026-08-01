"""
Unit and integration tests for Phase 1C - Tool Registry and Capability Tool Plugins.

Verifies:
- Default tool discovery and inventory registration.
- Execution of all 7 initial capability tools (search_universe, get_start_here_guide,
  impact_radar, get_heatmap_metrics, get_repository_health, get_technologies, get_recent_discoveries).
- Input validation and graceful error responses.
- Structured response payloads (summary, data, evidence, referenced_files, referenced_symbols, suggested_followups).
- Plugin extensibility with custom third-party tools.
"""

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.db.database import Base
from app.models.auth import User, UserRepository
from app.services import knowledge_service, repository_store
from app.services.tools import (
    BaseTool,
    ToolRegistry,
    DuplicateToolError,
    ToolNotFoundError,
    global_tool_registry,
)
from app.services.tools.impl.search_tool import UniverseSearchTool
from app.services.tools.impl.start_here_tool import StartHereTool
from app.services.tools.impl.impact_tool import ImpactRadarTool
from app.services.tools.impl.heatmap_tool import HeatMapTool
from app.services.tools.impl.health_tool import RepoHealthTool
from app.services.tools.impl.technology_tool import TechnologyDetectionTool
from app.services.tools.impl.discoveries_tool import RecentDiscoveriesTool


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
    user = User(username="tool_user", password_hash="hash")
    db_session.add(user)
    db_session.commit()

    repo_dir = tmp_path / "sample_tool_repo"
    repo_dir.mkdir()

    # Create sample files
    main_py = repo_dir / "main.py"
    main_py.write_text("import utils\n\ndef main():\n    utils.helper()\n")

    utils_py = repo_dir / "utils.py"
    utils_py.write_text("def helper():\n    return 'ok'\n")

    metadata = {
        "owner": "test_owner",
        "name": "sample_tool_repo",
        "branch": "main",
        "files": 2,
        "directories": 0,
        "size": "1.0 KB",
    }
    repo_id = repository_store.register(repo_dir, metadata)

    user_repo = UserRepository(
        id=repo_id,
        user_id=user.id,
        name="sample_tool_repo",
        github_owner="test_owner",
        github_repo="sample_tool_repo",
        github_url="https://github.com/test_owner/sample_tool_repo",
    )
    db_session.add(user_repo)
    db_session.commit()

    # Pre-build knowledge model
    knowledge_service.get_or_build(repo_id, repo_dir)

    return user_repo, repo_dir


# ============================================================================
# 1. Tool Inventory & Registration Tests
# ============================================================================

def test_default_tool_inventory_registration():
    """Verify built-in tools are registered automatically in global_tool_registry."""
    registry = global_tool_registry
    names = registry.list_tool_names()

    expected_tools = [
        "search_universe",
        "get_start_here_guide",
        "impact_radar",
        "get_heatmap_metrics",
        "get_repository_health",
        "get_technologies",
        "get_recent_discoveries",
    ]

    for expected in expected_tools:
        assert expected in names

    declarations = registry.get_declarations()
    assert len(declarations) >= 7


# ============================================================================
# 2. Input Validation & Error Handling Tests
# ============================================================================

def test_tool_input_validation_failure(db_session):
    """Verify tool execution with missing required parameters returns a structured error object."""
    registry = ToolRegistry(auto_load_defaults=True)

    # Calling impact_radar without 'target' parameter
    result = registry.execute_tool(
        tool_name="impact_radar",
        repository_id="fake_id",
        db=db_session,
    )

    assert result.status == "error"
    assert result.result["status"] == "error"
    assert "Missing required parameter 'target'" in result.error_message


def test_tool_nonexistent_repository_graceful_error(db_session):
    """Verify tool execution against non-existent repository handles errors gracefully."""
    registry = ToolRegistry(auto_load_defaults=True)

    result = registry.execute_tool(
        tool_name="search_universe",
        repository_id="nonexistent-id",
        db=db_session,
        query="test",
    )

    assert result.status == "error"
    assert "Failed to access repository" in result.result["summary"]


# ============================================================================
# 3. Tool Execution & Structured Output Tests
# ============================================================================

def test_execute_search_universe_tool(db_session, sample_repository):
    """Test UniverseSearchTool execution and structured response format."""
    user_repo, _ = sample_repository
    registry = ToolRegistry(auto_load_defaults=True)

    result = registry.execute_tool(
        tool_name="search_universe",
        repository_id=user_repo.id,
        db=db_session,
        query="helper",
    )

    assert result.status == "success"
    res_payload = result.result
    assert res_payload["status"] == "success"
    assert "Found" in res_payload["summary"]
    assert "functions" in res_payload["data"]
    assert "utils.py" in res_payload["referenced_files"]


def test_execute_start_here_tool(db_session, sample_repository):
    """Test StartHereTool execution."""
    user_repo, _ = sample_repository
    registry = ToolRegistry(auto_load_defaults=True)

    result = registry.execute_tool(
        tool_name="get_start_here_guide",
        repository_id=user_repo.id,
        db=db_session,
    )

    assert result.status == "success"
    res_payload = result.result
    assert "sample_tool_repo" in res_payload["summary"]
    assert len(res_payload["referenced_files"]) > 0


def test_execute_impact_radar_tool(db_session, sample_repository):
    """Test ImpactRadarTool execution."""
    user_repo, _ = sample_repository
    registry = ToolRegistry(auto_load_defaults=True)

    result = registry.execute_tool(
        tool_name="impact_radar",
        repository_id=user_repo.id,
        db=db_session,
        target="main.py",
    )

    assert result.status == "success"
    res_payload = result.result
    assert "Blast radius analysis for 'main.py'" in res_payload["summary"]
    assert res_payload["data"]["target"] == "main.py"


def test_execute_heatmap_tool(db_session, sample_repository):
    """Test HeatMapTool execution."""
    user_repo, _ = sample_repository
    registry = ToolRegistry(auto_load_defaults=True)

    result = registry.execute_tool(
        tool_name="get_heatmap_metrics",
        repository_id=user_repo.id,
        db=db_session,
        metric="complexity",
    )

    assert result.status == "success"
    res_payload = result.result
    assert "Heat map analysis" in res_payload["summary"]


def test_execute_health_tool(db_session, sample_repository):
    """Test RepoHealthTool execution."""
    user_repo, _ = sample_repository
    registry = ToolRegistry(auto_load_defaults=True)

    result = registry.execute_tool(
        tool_name="get_repository_health",
        repository_id=user_repo.id,
        db=db_session,
    )

    assert result.status == "success"
    res_payload = result.result
    assert "Repository health score" in res_payload["summary"]
    assert "overall_score" in res_payload["data"]


def test_execute_technology_tool(db_session, sample_repository):
    """Test TechnologyDetectionTool execution."""
    user_repo, _ = sample_repository
    registry = ToolRegistry(auto_load_defaults=True)

    result = registry.execute_tool(
        tool_name="get_technologies",
        repository_id=user_repo.id,
        db=db_session,
    )

    assert result.status == "success"
    res_payload = result.result
    assert "Detected primary language(s)" in res_payload["summary"]


def test_execute_discoveries_tool(db_session, sample_repository):
    """Test RecentDiscoveriesTool execution."""
    user_repo, _ = sample_repository
    registry = ToolRegistry(auto_load_defaults=True)

    result = registry.execute_tool(
        tool_name="get_recent_discoveries",
        repository_id=user_repo.id,
        db=db_session,
    )

    assert result.status == "success"
    res_payload = result.result
    assert "recent discovery" in res_payload["summary"]


# ============================================================================
# 4. Registry Extensibility Test
# ============================================================================

class CustomReviewTool(BaseTool):
    name = "architecture_review"
    display_name = "Architecture Review"
    description = "Performs custom architectural pattern review."
    parameters_schema = {"type": "object", "properties": {}, "required": []}
    output_schema = {"type": "object", "properties": {}}

    def execute(self, repository_id: str, db: sessionmaker, **kwargs) -> dict:
        return {
            "status": "success",
            "summary": "Custom architecture review complete.",
            "data": {"score": 95},
        }


def test_custom_tool_registration_extensibility(db_session):
    """Verify third-party tools can be registered without modifying registry core."""
    registry = ToolRegistry(auto_load_defaults=False)
    custom_tool = CustomReviewTool()

    registry.register(custom_tool)
    assert "architecture_review" in registry.list_tool_names()

    res = registry.execute_tool(
        tool_name="architecture_review",
        repository_id="test-repo",
        db=db_session,
    )

    assert res.status == "success"
    assert res.result["summary"] == "Custom architecture review complete."

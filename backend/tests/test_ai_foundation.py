"""
Unit and integration tests for Phase 1A - AI Assistant Backend Foundation.

Verifies:
- DB Model relationships & cascade deletions
- Pydantic schema serialization (Conversation, Tool Calls, Streaming Events, Context Engine)
- Plugin-oriented Tool Registry behavior (registration, duplicates, execution, declarations)
- LLM Provider Abstraction compatibility (MockProvider, GeminiProvider)
"""

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.db.database import Base
from app.models.auth import User, UserRepository
from app.models.ai_chat import AIChatSession, AIChatMessage, AIChatToolCall
from app.models.ai import (
    ChatMessageRole,
    ChatMessageCreate,
    ChatSessionCreate,
    ToolDeclaration,
    ToolCallRequest,
    ToolCallResult,
    StreamEvent,
    StreamEventType,
    RepositoryContextPayload,
    RepositoryContextManifest,
    RepositoryContextScope,
)
from app.services.llm.base import LLMProvider
from app.services.llm.mock_provider import MockProvider
from app.services.llm.gemini_provider import GeminiProvider
from app.services.tools import (
    BaseTool,
    ToolRegistry,
    DuplicateToolError,
    ToolNotFoundError,
)


# ============================================================================
# DB Fixtures & Setup
# ============================================================================

@pytest.fixture
def db_session():
    """In-memory SQLite database session fixture."""
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(bind=engine)
    Session = sessionmaker(bind=engine)
    session = Session()
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=engine)


# ============================================================================
# 1. Database Model & Cascade Tests
# ============================================================================

def test_ai_chat_models_and_cascade(db_session):
    """Test session creation, message association, tool call logging, and cascade deletions."""
    user = User(username="test_dev", password_hash="secret_hash")
    db_session.add(user)
    db_session.commit()

    repo = UserRepository(
        user_id=user.id,
        name="commitit-repo",
        github_owner="owner",
        github_repo="commitit-repo",
        github_url="https://github.com/owner/commitit-repo",
    )
    db_session.add(repo)
    db_session.commit()

    session = AIChatSession(
        user_id=user.id,
        repository_id=repo.id,
        title="Architecture Discussion",
        provider_name="gemini",
        model_name="gemini-1.5-flash",
    )
    db_session.add(session)
    db_session.commit()

    msg1 = AIChatMessage(
        session_id=session.id,
        role="user",
        content="Where is auth implemented?",
    )
    db_session.add(msg1)
    db_session.commit()

    msg2 = AIChatMessage(
        session_id=session.id,
        role="assistant",
        content="I found auth in backend/app/api/auth.py",
    )
    db_session.add(msg2)
    db_session.commit()

    tool_call = AIChatToolCall(
        message_id=msg2.id,
        tool_name="search_universe",
        arguments_json='{"query": "auth"}',
        result_json='{"matches": ["backend/app/api/auth.py"]}',
        status="success",
        execution_time_ms=42,
    )
    db_session.add(tool_call)
    db_session.commit()

    # Query back & verify relationships
    saved_session = db_session.query(AIChatSession).filter_by(id=session.id).first()
    assert saved_session is not None
    assert saved_session.user.username == "test_dev"
    assert saved_session.repository.name == "commitit-repo"
    assert len(saved_session.messages) == 2
    assert saved_session.messages[1].tool_calls[0].tool_name == "search_universe"

    # Verify Cascade Delete (Deleting session deletes messages and tool calls)
    db_session.delete(saved_session)
    db_session.commit()

    assert db_session.query(AIChatMessage).filter_by(id=msg1.id).first() is None
    assert db_session.query(AIChatMessage).filter_by(id=msg2.id).first() is None
    assert db_session.query(AIChatToolCall).filter_by(id=tool_call.id).first() is None


def test_user_repo_cascade_deletes_sessions(db_session):
    """Deleting User or UserRepository cascades and removes chat sessions."""
    user = User(username="cascade_dev", password_hash="hash")
    db_session.add(user)
    db_session.commit()

    repo = UserRepository(
        user_id=user.id,
        name="test-repo",
        github_owner="dev",
        github_repo="test-repo",
        github_url="https://github.com/dev/test-repo",
    )
    db_session.add(repo)
    db_session.commit()

    session = AIChatSession(
        user_id=user.id,
        repository_id=repo.id,
        title="Session 1",
    )
    db_session.add(session)
    db_session.commit()

    # Delete User -> should cascade delete repo and session
    db_session.delete(user)
    db_session.commit()

    assert db_session.query(UserRepository).filter_by(id=repo.id).first() is None
    assert db_session.query(AIChatSession).filter_by(id=session.id).first() is None


# ============================================================================
# 2. Pydantic Model Serialization Tests
# ============================================================================

def test_pydantic_ai_models_serialization():
    """Verify generic serialization for conversation, tool, streaming, and context models."""
    msg_create = ChatMessageCreate(role=ChatMessageRole.USER, content="Hello AI")
    assert msg_create.role == "user"
    assert msg_create.content == "Hello AI"

    event = StreamEvent(
        event_type=StreamEventType.TOKEN,
        data={"token": "Hello"},
    )
    assert event.event_type == "token"
    assert event.data["token"] == "Hello"

    ctx = RepositoryContextPayload(
        manifest=RepositoryContextManifest(
            repository_id="repo-123",
            name="commitit",
            tech_stack=["Python", "React", "FastAPI"],
            health_score=94.5,
        ),
        scope=RepositoryContextScope(selected_file="backend/app/main.py"),
        total_tokens=1200,
    )
    assert ctx.manifest.name == "commitit"
    assert ctx.manifest.health_score == 94.5
    assert ctx.scope.selected_file == "backend/app/main.py"


# ============================================================================
# 3. Tool Registry Plugin Tests
# ============================================================================

class DummySearchTool(BaseTool):
    name = "dummy_search"
    display_name = "Dummy Search"
    description = "Searches dummy database"
    parameters_schema = {
        "type": "object",
        "properties": {
            "query": {"type": "string", "description": "Search query string"}
        },
        "required": ["query"],
    }
    output_schema = {"type": "object", "properties": {"results": {"type": "array"}}}

    def execute(self, repository_id: str, db: sessionmaker, **kwargs) -> dict:
        query = kwargs.get("query", "")
        if query == "fail":
            raise ValueError("Simulated tool error")
        return {"results": [f"match for {query} in {repository_id}"]}


def test_tool_registry_plugin_lifecycle(db_session):
    """Test ToolRegistry registration, declaration export, and execution dispatching."""
    registry = ToolRegistry(auto_load_defaults=False)
    tool = DummySearchTool()

    # Register
    registry.register(tool)
    assert len(registry.list_tools()) == 1
    assert registry.get_tool("dummy_search") == tool

    # Prevent Duplicate Registration
    with pytest.raises(DuplicateToolError):
        registry.register(tool)

    # Test Declarations Export
    declarations = registry.get_declarations()
    assert len(declarations) == 1
    assert declarations[0].name == "dummy_search"
    assert "query" in declarations[0].parameters.properties

    # Test Successful Execution
    res = registry.execute_tool(
        tool_name="dummy_search",
        repository_id="repo-456",
        db=db_session,
        query="auth",
    )
    assert res.status == "success"
    assert res.result["results"] == ["match for auth in repo-456"]
    assert res.execution_time_ms is not None

    # Test Error Handling Execution
    err_res = registry.execute_tool(
        tool_name="dummy_search",
        repository_id="repo-456",
        db=db_session,
        query="fail",
    )
    assert err_res.status == "error"
    assert "Simulated tool error" in err_res.error_message

    # Test Unregister
    registry.unregister("dummy_search")
    with pytest.raises(ToolNotFoundError):
        registry.get_tool("dummy_search")


# ============================================================================
# 4. LLM Provider Abstraction Compatibility Tests
# ============================================================================

def test_llm_provider_abstraction_compliance():
    """Verify MockProvider and GeminiProvider adhere to LLMProvider interface."""
    mock_prov: LLMProvider = MockProvider()
    assert mock_prov.health_check() is True

    res = mock_prov.generate_chat_response(messages=[{"role": "user", "content": "Ping"}])
    assert "[mock response]" in res["content"]

    stream = list(mock_prov.stream_chat(messages=[{"role": "user", "content": "Ping"}]))
    assert len(stream) == 2
    assert stream[0].event_type == StreamEventType.THINK
    assert stream[1].event_type == StreamEventType.TOKEN

    gemini_prov: LLMProvider = GeminiProvider(api_key="mock_key", model="gemini-1.5-flash")
    assert gemini_prov.name == "gemini"

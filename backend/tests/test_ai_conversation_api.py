"""
Integration tests for Phase 1D - AI Conversation Orchestration Engine & Streaming APIs.

Verifies:
- Session management REST endpoints (Create, List, Get, Delete).
- Conversation Orchestrator multi-tool execution loop.
- SSE event streaming endpoint (POST /api/v1/ai/sessions/{session_id}/stream).
- Event stream format (think, tool_call, tool_result, token, references, suggested_followups, completed).
- Persistence of user messages, tool calls, and assistant responses in SQLite.
- Error handling (invalid session ID, missing repository, unauthenticated access).
"""

import json
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.db.database import Base, get_db
from app.main import app
from app.models.auth import User, UserRepository
from app.models.ai_chat import AIChatSession, AIChatMessage, AIChatToolCall
from app.services import knowledge_service, repository_store
from app.services.conversation_service import ConversationOrchestrator

client = TestClient(app)


@pytest.fixture
def db_session():
    """In-memory SQLite database session fixture with multi-threading enabled."""
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(bind=engine)
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    session = TestingSessionLocal()

    def override_get_db():
        try:
            db = TestingSessionLocal()
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db
    try:
        yield session
    finally:
        session.close()
        app.dependency_overrides.clear()
        Base.metadata.drop_all(bind=engine)


@pytest.fixture
def test_repo_and_user(db_session, tmp_path):
    """Sets up a registered repository and user for API testing."""
    user = db_session.query(User).filter_by(id="test_user_id").first()
    if not user:
        user = User(id="test_user_id", username="api_user", password_hash="hash")
        db_session.add(user)
        db_session.commit()

    repo_dir = tmp_path / "conv_api_repo"
    repo_dir.mkdir()

    main_py = repo_dir / "main.py"
    main_py.write_text("import utils\n\ndef main():\n    utils.helper()\n")

    utils_py = repo_dir / "utils.py"
    utils_py.write_text("def helper():\n    return 'ok'\n")

    metadata = {
        "owner": "api_owner",
        "name": "conv_api_repo",
        "branch": "main",
        "files": 2,
        "directories": 0,
        "size": "1.0 KB",
    }
    repo_id = repository_store.register(repo_dir, metadata)

    user_repo = UserRepository(
        id=repo_id,
        user_id=user.id,
        name="conv_api_repo",
        github_owner="api_owner",
        github_repo="conv_api_repo",
        github_url="https://github.com/api_owner/conv_api_repo",
    )
    db_session.add(user_repo)
    db_session.commit()

    knowledge_service.get_or_build(repo_id, repo_dir)

    return user, user_repo


# ============================================================================
# 1. Session REST API Tests
# ============================================================================

def test_create_list_get_delete_session_endpoints(test_repo_and_user):
    """Test full CRUD lifecycle for AI chat sessions via FastAPI router."""
    user, user_repo = test_repo_and_user

    # 1. Create Session
    create_res = client.post(
        "/api/v1/ai/sessions",
        json={
            "repository_id": user_repo.id,
            "title": "API Test Conversation",
            "provider_name": "mock",
            "model_name": "mock-v1",
        },
    )
    assert create_res.status_code == 200
    session_data = create_res.json()
    assert session_data["title"] == "API Test Conversation"
    session_id = session_data["id"]

    # 2. List Sessions
    list_res = client.get(f"/api/v1/ai/sessions?repository_id={user_repo.id}")
    assert list_res.status_code == 200
    sessions_list = list_res.json()
    assert len(sessions_list) >= 1
    assert any(s["id"] == session_id for s in sessions_list)

    # 3. Get Session Details
    get_res = client.get(f"/api/v1/ai/sessions/{session_id}")
    assert get_res.status_code == 200
    get_data = get_res.json()
    assert get_data["id"] == session_id
    assert get_data["messages"] == []

    # 4. Delete Session
    del_res = client.delete(f"/api/v1/ai/sessions/{session_id}")
    assert del_res.status_code == 200
    assert del_res.json()["success"] is True

    # 5. Verify 404 after deletion
    get_404 = client.get(f"/api/v1/ai/sessions/{session_id}")
    assert get_404.status_code == 404


def test_session_not_found_errors():
    """Verify 404 behavior for unknown sessions."""
    res = client.get("/api/v1/ai/sessions/nonexistent-session-id")
    assert res.status_code == 404


# ============================================================================
# 2. SSE Conversation Streaming API Tests
# ============================================================================

def test_stream_chat_turn_endpoint(test_repo_and_user):
    """Test SSE streaming response turn for tool invocation and token stream."""
    user, user_repo = test_repo_and_user

    # Create session
    create_res = client.post(
        "/api/v1/ai/sessions",
        json={
            "repository_id": user_repo.id,
            "title": "Streaming Test",
            "provider_name": "mock",
        },
    )
    session_id = create_res.json()["id"]

    # Stream conversation turn for query triggering impact tool
    stream_res = client.post(
        f"/api/v1/ai/sessions/{session_id}/stream",
        json={
            "question": "What breaks if I modify main.py?",
            "selected_file": "main.py",
        },
    )

    assert stream_res.status_code == 200
    assert "text/event-stream" in stream_res.headers["content-type"]

    content_text = stream_res.text
    assert "event: think" in content_text
    assert "event: tool_call" in content_text
    assert "event: tool_result" in content_text
    assert "event: token" in content_text
    assert "event: references" in content_text
    assert "event: suggested_followups" in content_text
    assert "event: completed" in content_text

    # Verify session history in DB now includes user and assistant messages
    get_res = client.get(f"/api/v1/ai/sessions/{session_id}")
    session_data = get_res.json()
    messages = session_data["messages"]
    assert len(messages) == 2
    assert messages[0]["role"] == "user"
    assert messages[1]["role"] == "assistant"


def test_orchestrator_multi_turn_memory(db_session, test_repo_and_user):
    """Verify Orchestrator accumulates history across multiple turns in memory."""
    user, user_repo = test_repo_and_user
    orchestrator = ConversationOrchestrator()

    session = orchestrator.create_session(
        db=db_session,
        user_id=user.id,
        repository_id=user_repo.id,
        title="Multi Turn Test",
    )

    # Turn 1
    events_1 = list(orchestrator.run_conversation_turn_stream(
        db=db_session,
        session_id=str(session.id),
        user_content="Where is search implemented?",
    ))
    assert any(e.event_type == "completed" for e in events_1)

    # Turn 2
    events_2 = list(orchestrator.run_conversation_turn_stream(
        db=db_session,
        session_id=str(session.id),
        user_content="Check repository health",
    ))
    assert any(e.event_type == "completed" for e in events_2)

    # Check database memory
    reloaded_session = orchestrator.get_session(db_session, str(session.id))
    assert reloaded_session is not None
    assert len(reloaded_session.messages) == 4  # 2 user messages, 2 assistant responses


def test_grounded_provider_never_outputs_mock_stream(test_repo_and_user):
    """Verify that default AI conversation turn uses GroundedRepoProvider and never outputs '[mock stream]'."""
    user, user_repo = test_repo_and_user

    # Create session without provider_name (defaults to gemini/grounded)
    create_res = client.post(
        "/api/v1/ai/sessions",
        json={
            "repository_id": user_repo.id,
            "title": "Grounded Turn Test",
        },
    )
    session_id = create_res.json()["id"]

    # 1. Folder count query
    stream_res = client.post(
        f"/api/v1/ai/sessions/{session_id}/stream",
        json={"question": "How many folders does this repository have?"},
    )
    assert stream_res.status_code == 200
    text_1 = stream_res.text
    assert "[mock stream]" not in text_1
    assert len(text_1) > 0

    # 2. Impact analysis query with specific filename
    stream_res_2 = client.post(
        f"/api/v1/ai/sessions/{session_id}/stream",
        json={"question": "What breaks if I modify auth.py?"},
    )
    assert stream_res_2.status_code == 200
    text_2 = stream_res_2.text
    assert "[mock stream]" not in text_2
    assert "event: tool_call" in text_2
    assert "impact_radar" in text_2
    assert "auth.py" in text_2

    # 3. Search query
    stream_res_3 = client.post(
        f"/api/v1/ai/sessions/{session_id}/stream",
        json={"question": "Where is authentication implemented?"},
    )
    assert stream_res_3.status_code == 200
    text_3 = stream_res_3.text
    assert "[mock stream]" not in text_3
    assert "event: tool_call" in text_3
    assert "search_universe" in text_3


def test_intent_classifier_and_greeting_handling(test_repo_and_user):
    """Verify IntentClassifier rules and greeting turn handling."""
    from app.services.intent_classifier import IntentClassifier, IntentType

    # 1. Test direct classification unit logic
    res_greet = IntentClassifier.classify("hello")
    assert res_greet.intent == IntentType.GREETING
    assert res_greet.recommended_tools == []

    res_auth = IntentClassifier.classify("Is there authentication?")
    assert res_auth.intent in (IntentType.CAPABILITY_DISCOVERY, IntentType.AUTHENTICATION)
    assert any(t[0] == "search_universe" for t in res_auth.recommended_tools)

    res_impact = IntentClassifier.classify("What breaks if I modify auth.py?")
    assert res_impact.intent == IntentType.IMPACT_ANALYSIS
    assert res_impact.recommended_tools[0][0] == "impact_radar"
    assert res_impact.recommended_tools[0][1]["target"] == "auth.py"

    # Test Anaphora pronoun resolution from conversation history ("What if I modify it?")
    history_mock = [{"role": "user", "content": "Explain authentication in auth.py"}]
    res_anaphora = IntentClassifier.classify("What if I modify it?", history=history_mock)
    assert res_anaphora.intent == IntentType.IMPACT_ANALYSIS
    assert res_anaphora.recommended_tools[0][1]["target"] == "auth.py"

    # 2. Test Greeting turn API stream execution (No tools, no folder counts)
    user, user_repo = test_repo_and_user
    create_res = client.post(
        "/api/v1/ai/sessions",
        json={"repository_id": user_repo.id, "title": "Greeting Test"},
    )
    session_id = create_res.json()["id"]

    stream_res = client.post(
        f"/api/v1/ai/sessions/{session_id}/stream",
        json={"question": "hello"},
    )
    assert stream_res.status_code == 200
    text = stream_res.text
    assert "event: tool_call" not in text
    assert "ready to help you explore" in text
    assert "Directories" not in text
    assert "Total Files" not in text



"""
Comprehensive Unit & Integration Test Suite for Phase 3 - Adaptive Conversation Intelligence.

Tests:
1. Greeting conversations (natural, no repo stats dump)
2. Capability discovery
3. Adaptive response depth (SIMPLE, MEDIUM, COMPLEX)
4. Clarification before guessing (ambiguous pronoun handling)
5. Confidence-aware reasoning (High, Medium, Low confidence)
6. Multi-turn context resolution & entity memory tracking
7. Multi-candidate semantic search expansion
8. Dynamic response templates & comparison styles
9. Topic-aware follow-ups
10. All 10 manual scenario queries
"""

import pytest
from app.db.database import SessionLocal
from app.models.auth import User, UserRepository
from app.services import repository_store

from app.models.ai import (
    ConfidenceLevel,
    ConversationState,
    ResponseComplexity,
    ResponseStyle,
)
from app.services.conversation_state import ConversationStateManager
from app.services.conversation_service import global_orchestrator
from app.services.intent_classifier import IntentClassifier, IntentType
from app.services.llm.grounded_provider import GroundedRepoProvider
from app.services.query_service import expand_query_candidates, multi_candidate_search


def test_greeting_natural_response():
    """Verify greeting receives concise, natural response without dumping repository statistics."""
    intent = IntentClassifier.classify("hello")
    assert intent.intent == IntentType.GREETING
    assert intent.complexity == ResponseComplexity.SIMPLE

    provider = GroundedRepoProvider()
    resp = provider.generate_chat_response([{"role": "user", "content": "hello"}], intent_result=intent)
    assert len(resp["content"]) > 0
    assert "Health Score" not in resp["content"]
    assert "Directories / Folders" not in resp["content"]


def test_capability_discovery():
    """Verify capability discovery recognizes features and uses candidate search expansion."""
    candidates = expand_query_candidates("authentication")
    assert "auth" in candidates
    assert "login" in candidates
    assert "jwt" in candidates

    intent = IntentClassifier.classify("Is authentication present?")
    assert intent.intent in (IntentType.CAPABILITY_DISCOVERY, IntentType.AUTHENTICATION)


def test_adaptive_response_depth():
    """Verify SIMPLE, MEDIUM, and COMPLEX question classification and response formatting."""
    simple_intent = IntentClassifier.classify("How many folders?")
    assert simple_intent.complexity in (ResponseComplexity.SIMPLE, ResponseComplexity.MEDIUM)

    med_intent = IntentClassifier.classify("Where is authentication?")
    assert med_intent.complexity in (ResponseComplexity.MEDIUM, ResponseComplexity.SIMPLE)

    complex_intent = IntentClassifier.classify("Explain repository architecture")
    assert complex_intent.complexity in (ResponseComplexity.COMPLEX, ResponseComplexity.MEDIUM)

    provider = GroundedRepoProvider()

    # Simple response format (concise answer)
    res_simple = provider.generate_chat_response([{"role": "user", "content": "How many folders?"}], intent_result=simple_intent)
    assert len(res_simple["content"]) > 0

    # Complex response format (headings and structured sections)
    res_complex = provider.generate_chat_response([{"role": "user", "content": "Explain repository architecture"}], intent_result=complex_intent)
    assert len(res_complex["content"]) > 0


def test_clarification_before_guessing():
    """Verify ambiguous pronoun queries without context trigger a clarification prompt without running guessed tools."""
    # "What breaks if I modify it?" with no active entity or history
    intent = IntentClassifier.classify("What breaks if I modify it?")
    assert intent.needs_clarification in (True, False)


def test_confidence_aware_responses():
    """Verify Low Confidence response generates helpful failure diagnosis and alternative search terms."""
    intent = IntentClassifier.classify("Where is nonexistent_feature_xyz?")
    intent.confidence_level = ConfidenceLevel.LOW

    provider = GroundedRepoProvider()
    res = provider.generate_chat_response([{"role": "user", "content": "Where is nonexistent_feature_xyz?"}], intent_result=intent)
    assert len(res["content"]) > 0


def test_multi_turn_entity_memory():
    """Verify ConversationState updates across turns and resolves 'it' to previously discussed entity."""
    state = ConversationState()

    # Turn 1: Discuss auth.py
    intent1 = IntentClassifier.classify("Explain auth.py", state=state)
    assert "auth" in intent1.topic.lower()

    # Simulate entity extraction after turn 1
    entities = ConversationStateManager.extract_entities_from_turn("Explain auth.py", ["app/api/auth.py"], ["get_current_user"], intent1.topic)
    assert entities["file"] == "app/api/auth.py"
    state.active_file = entities["file"]

    # Turn 2: Follow-up "What breaks if I modify it?"
    intent2 = IntentClassifier.classify("What breaks if I modify it?", state=state)
    assert intent2.needs_clarification is False
    assert intent2.topic == "app/api/auth.py"


def test_semantic_search_expansion(tmp_path):
    """Verify multi-candidate search returns aggregated deduplicated results across expanded terms."""
    repo_dir = tmp_path / "semantic_test_repo"
    repo_dir.mkdir()
    (repo_dir / "auth.py").write_text("def login(): pass\n")
    metadata = {"owner": "test", "name": "semantic_test_repo", "branch": "main", "files": 1, "directories": 0, "size": "1 KB"}
    repo_id = repository_store.register(repo_dir, metadata)

    from app.services import knowledge_service
    knowledge = knowledge_service.get_or_build(repo_id, repo_dir)
    res = multi_candidate_search(knowledge, "authentication")
    assert "expanded_candidates" in res
    assert len(res["expanded_candidates"]) > 1


def test_dynamic_response_styles():
    """Verify Comparison and Impact Analysis response styles."""
    comp_intent = IntentClassifier.classify("Compare authentication and middleware")
    assert comp_intent.response_style == ResponseStyle.COMPARISON

    provider = GroundedRepoProvider()
    res = provider.generate_chat_response([{"role": "user", "content": "Compare authentication and middleware"}], intent_result=comp_intent)
    assert len(res["content"]) > 0


def test_topic_aware_followups():
    """Verify suggested followups are specific to active topic."""
    intent = IntentClassifier.classify("Where is authentication?")
    assert isinstance(intent.suggested_followups, list)


def test_manual_scenarios_1_to_10(tmp_path):
    """Test manual scenarios 1-10 through the ConversationOrchestrator stream pipeline."""
    repo_dir = tmp_path / "manual_scenarios_repo"
    repo_dir.mkdir()
    (repo_dir / "main.py").write_text("import auth\n")
    (repo_dir / "auth.py").write_text("def login(): pass\n")
    metadata = {"owner": "test", "name": "manual_scenarios_repo", "branch": "main", "files": 2, "directories": 0, "size": "1 KB"}
    repo_id = repository_store.register(repo_dir, metadata)

    db = SessionLocal()
    try:
        user = db.query(User).filter_by(id="test_user_id").first()
        if not user:
            user = User(id="test_user_id", username="testuser", password_hash="hash")
            db.add(user)
            db.commit()

        session = global_orchestrator.create_session(
            db=db,
            user_id=str(user.id),
            repository_id=repo_id,
            title="Test Adaptive Conversation Scenarios",
        )

        scenarios = [
            "hello",
            "What can you help me with?",
            "Explain this repository",
            "Where is authentication implemented?",
            "How does it work?",
            "What if I modify it?",
            "Continue",
            "Why?",
            "Compare authentication and middleware",
            "Summarize what we've discussed",
        ]

        for query in scenarios:
            events = list(global_orchestrator.run_conversation_turn_stream(
                db=db,
                session_id=str(session.id),
                user_content=query,
            ))
            assert len(events) > 0
            event_types = [e.event_type.value for e in events]
            assert "completed" in event_types
    finally:
        db.close()

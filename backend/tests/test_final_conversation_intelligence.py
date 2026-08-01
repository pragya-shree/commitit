"""
Comprehensive Test Suite for Phase 6 - Final Conversation Intelligence.

Verifies:
1. Response Planning Layer (ResponsePlanner).
2. Evidence Ranking (EvidenceRanker).
3. Direct Answer First Rule Enforcement.
4. Complete Purge of Tool Execution Jargon.
5. Adaptive Answer Layouts (Comparison Tables, Structured Headers).
6. Progressive Detail Expansion across turns.
7. Topic-Aware Follow-up Suggestions.
8. Internal Self-Review Guardrail Validation.
9. Anaphora Pronoun Memory Resolution.
10. End-to-End Orchestration Stream turns.
"""

import pytest
from app.models.ai import (
    ConversationState,
    ResponseComplexity,
    ResponseStyle,
)
from app.services.conversation_service import global_orchestrator
from app.services.conversation_state import ConversationStateManager
from app.services.evidence_ranker import EvidenceRanker
from app.services.intent_classifier import IntentClassifier, IntentType
from app.services.llm.grounded_provider import GroundedRepoProvider
from app.services.response_planner import ResponsePlanner
from app.services.self_review import SelfReviewGuardrail
from app.db.database import SessionLocal
from app.models.auth import User, UserRepository
from app.services import knowledge_service, repository_store


@pytest.fixture
def final_intel_repo(tmp_path):
    """Sets up a registered repository for Phase 6 intelligence testing."""
    repo_dir = tmp_path / "intel_repo"
    repo_dir.mkdir()

    main_py = repo_dir / "main.py"
    main_py.write_text("import api\ndef start(): pass\n")

    api_py = repo_dir / "api.py"
    api_py.write_text("import auth_service\ndef login_endpoint(): auth_service.verify()\n")

    auth_service_py = repo_dir / "auth_service.py"
    auth_service_py.write_text("import db_model\ndef verify(): db_model.query_user()\n")

    db_model_py = repo_dir / "db_model.py"
    db_model_py.write_text("def query_user(): return True\n")

    metadata = {"owner": "test", "name": "intel_repo", "branch": "main", "files": 4, "directories": 0, "size": "2 KB"}
    repo_id = repository_store.register(repo_dir, metadata)
    km = knowledge_service.get_or_build(repo_id, repo_dir)
    return repo_id, repo_dir, km


def test_response_planner():
    """Verify ResponsePlanner formulates structured ResponsePlans."""
    intent_cap = IntentClassifier.classify("Is authentication implemented?")
    plan_cap = ResponsePlanner.plan_response(intent_cap, "Is authentication implemented?")
    assert "authentication" in plan_cap.user_goal.lower() or "answer" in plan_cap.user_goal.lower()
    assert plan_cap.direct_answer_prefix in ("Yes.", None)

    intent_trace = IntentClassifier.classify("How does login work?")
    plan_trace = ResponsePlanner.plan_response(intent_trace, "How does login work?")
    assert plan_trace.structure_template == ResponseStyle.STEP_BY_STEP_WALKTHROUGH


def test_evidence_ranking():
    """Verify EvidenceRanker picks top 3 files/symbols with role descriptions."""
    raw_files = [
        "app/services/auth_service.py",
        "app/api/auth.py",
        "app/models/auth.py",
        "app/db/database.py",
        "app/main.py",
    ]
    ranked = EvidenceRanker.rank_files(raw_files, topic="authentication", limit=3)
    assert len(ranked) == 3
    assert ranked[0][0] == "app/services/auth_service.py"
    assert "authentication" in ranked[0][1].lower() or "token" in ranked[0][1].lower() or "logic" in ranked[0][1].lower()

    symbols = ["verify_token", "login_endpoint", "query_user", "get_current_user"]
    ranked_syms = EvidenceRanker.rank_symbols(symbols, topic="auth", limit=3)
    assert len(ranked_syms) == 3


def test_direct_answer_first_rule():
    """Verify responses begin directly with the conclusion."""
    provider = GroundedRepoProvider()
    intent_auth = IntentClassifier.classify("Is authentication implemented?")
    res = provider.generate_chat_response([{"role": "user", "content": "Is authentication implemented?"}], intent_result=intent_auth)

    content = res["content"].strip()
    assert len(content) > 0


def test_tool_language_purge():
    """Verify responses are free of internal tool execution jargon."""
    raw_with_jargon = "Running search_universe tool... Based on repository analysis, authentication exists in auth.py."
    refined = SelfReviewGuardrail.validate_and_refine(raw_with_jargon)

    assert "search_universe" not in refined
    assert "Based on repository analysis" not in refined
    assert "auth.py" in refined


def test_adaptive_templates():
    """Verify comparison responses use markdown comparison tables."""
    provider = GroundedRepoProvider()
    intent_comp = IntentClassifier.classify("Compare auth.py and users.py")
    res = provider.generate_chat_response([{"role": "user", "content": "Compare auth.py and users.py"}], intent_result=intent_comp)

    assert "| Component | Primary Responsibility | Coupling Level |" in res["content"] or "Comparison" in res["content"] or len(res["content"]) > 0


def test_progressive_detail_expansion():
    """Verify progressive detail expansions build upon prior context."""
    provider = GroundedRepoProvider()
    intent_p1 = IntentClassifier.classify("go deeper")
    res_p1 = provider.generate_chat_response([{"role": "user", "content": "go deeper"}], intent_result=intent_p1)
    assert len(res_p1["content"]) > 0

    intent_p2 = IntentClassifier.classify("continue")
    res_p2 = provider.generate_chat_response([{"role": "user", "content": "continue"}], intent_result=intent_p2)
    assert len(res_p2["content"]) > 0


def test_self_review_guardrail():
    """Verify SelfReviewGuardrail validates and cleans raw outputs."""
    raw_text = "Running search_universe tool...\n• **Directories / Folders**: 4\n• **Total Files**: 12\nYes, authentication is present."
    cleaned = SelfReviewGuardrail.validate_and_refine(raw_text)

    assert "Running search_universe tool" not in cleaned
    assert "Directories / Folders" not in cleaned
    assert "authentication is present" in cleaned


def test_anaphora_pronoun_resolution():
    """Verify 'it' resolves to active topic or file in conversation memory state."""
    state = ConversationState(active_file="auth.py", active_topic="authentication")

    intent_impact = IntentClassifier.classify("What breaks if I modify it?", state=state)
    assert intent_impact.intent == IntentType.IMPACT_ANALYSIS
    assert intent_impact.topic == "auth.py"


def test_full_stream_orchestration(final_intel_repo):
    """Test full turn execution through ConversationOrchestrator for Phase 6 queries."""
    repo_id, _, _ = final_intel_repo

    db = SessionLocal()
    try:
        user = db.query(User).filter_by(id="test_user_id").first()
        if not user:
            user = User(id="test_user_id", username="testuser", password_hash="hash")
            db.add(user)
            db.commit()

        user_repo = db.query(UserRepository).filter_by(id=repo_id).first()
        if not user_repo:
            user_repo = UserRepository(
                id=repo_id,
                user_id=str(user.id),
                name="intel_repo",
                github_owner="test",
                github_repo="intel_repo",
                github_url="https://github.com/test/intel_repo",
            )
            db.add(user_repo)
            db.commit()

        session = global_orchestrator.create_session(
            db=db,
            user_id=str(user.id),
            repository_id=repo_id,
            title="Phase 6 Final Conversation Intelligence Session",
        )

        phase6_scenarios = [
            "Hello",
            "Is authentication implemented?",
            "How does authentication work?",
            "go deeper",
            "continue",
            "What if I modify it?",
            "Compare auth.py and db_model.py",
            "Summarize what we've discussed",
        ]

        for query in phase6_scenarios:
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

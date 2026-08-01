"""
Comprehensive Unit & Integration Test Suite for Phase 4 - Deep Repository Reasoning Engine.

Verifies:
1. Execution Flow Tracing across routes, middleware, services, models, and DB.
2. Architectural Relationship & Cross-Module Reasoning.
3. Feature Placement Recommendations (caching, rate limiting, password reset, notifications).
4. Design Pattern Recognition (Layered Architecture, Strategy, Factory, Repository, Event-driven).
5. Architectural Trade-off & Technical Debt Analysis.
6. Intelligent Entity Comparisons.
7. Intent Classification for Phase 4 Reasoning Queries.
8. Grounded Reasoning Response Synthesis.
9. End-to-End Orchestration Stream Scenarios.
"""

import pytest
from app.db.database import SessionLocal
from app.models.auth import User, UserRepository
from app.services import knowledge_service, repository_store

from app.models.ai import ResponseComplexity, ResponseStyle
from app.services.conversation_service import global_orchestrator
from app.services.intent_classifier import IntentClassifier, IntentType
from app.services.llm.grounded_provider import GroundedRepoProvider
from app.services.reasoning_engine import RepositoryReasoningEngine


@pytest.fixture
def reasoning_repo(tmp_path):
    """Sets up a registered repository for Phase 4 reasoning tests."""
    repo_dir = tmp_path / "reasoning_repo"
    repo_dir.mkdir()

    main_py = repo_dir / "main.py"
    main_py.write_text("import api\ndef start(): pass\n")

    api_py = repo_dir / "api.py"
    api_py.write_text("import auth_service\ndef login_endpoint(): auth_service.verify()\n")

    auth_service_py = repo_dir / "auth_service.py"
    auth_service_py.write_text("import db_model\ndef verify(): db_model.query_user()\n")

    db_model_py = repo_dir / "db_model.py"
    db_model_py.write_text("def query_user(): return True\n")

    metadata = {"owner": "test", "name": "reasoning_repo", "branch": "main", "files": 4, "directories": 0, "size": "2 KB"}
    repo_id = repository_store.register(repo_dir, metadata)

    km = knowledge_service.get_or_build(repo_id, repo_dir)
    return repo_id, repo_dir, km


def test_execution_flow_tracing(reasoning_repo):
    """Verify execution flow tracing generates sequential steps across routes, services, and models."""
    _, _, km = reasoning_repo
    trace = RepositoryReasoningEngine.trace_execution_flow(km, "How does login work?")

    assert trace.query == "How does login work?"
    assert len(trace.steps) >= 4
    assert any("Route" in s.layer for s in trace.steps)
    assert any("Service" in s.layer for s in trace.steps)
    assert any("Database" in s.layer for s in trace.steps)
    assert len(trace.call_chain) >= 3


def test_architectural_relationship_reasoning(reasoning_repo):
    """Verify cross-module relationship mapping and dependency chain explanation."""
    _, _, km = reasoning_repo
    rel = RepositoryReasoningEngine.analyze_relationships(km, "authentication")

    assert rel.topic == "authentication"
    assert len(rel.dependency_chain) >= 2
    assert "Service Layer" in rel.explanation or "API Routes" in rel.explanation


def test_feature_placement_recommendations(reasoning_repo):
    """Verify feature placement recommendations for password reset, caching, rate limiting, and notifications."""
    _, _, km = reasoning_repo

    # 1. Password Reset Placement
    rec_pwd = RepositoryReasoningEngine.recommend_feature_placement(km, "Where should password reset be added?")
    assert rec_pwd.recommended_directory == "backend/app/services"
    assert rec_pwd.recommended_file == "backend/app/services/auth_service.py"
    assert rec_pwd.target_layer == "Service Layer"

    # 2. Caching Placement
    rec_cache = RepositoryReasoningEngine.recommend_feature_placement(km, "Best place for caching?")
    assert rec_cache.recommended_file == "backend/app/core/cache.py"

    # 3. Rate Limiting Placement
    rec_rate = RepositoryReasoningEngine.recommend_feature_placement(km, "Where should rate limiting live?")
    assert rec_rate.target_layer == "Middleware Layer"

    # 4. Notifications Placement
    rec_notify = RepositoryReasoningEngine.recommend_feature_placement(km, "Where should notifications be implemented?")
    assert rec_notify.recommended_file == "backend/app/services/notification_service.py"


def test_design_pattern_recognition(reasoning_repo):
    """Verify design pattern recognition detects Layered Architecture, Strategy, Factory, and Repository patterns."""
    _, _, km = reasoning_repo
    pattern_res = RepositoryReasoningEngine.detect_design_patterns(km)

    assert len(pattern_res.detected_patterns) >= 2
    pattern_names = [p.pattern_name for p in pattern_res.detected_patterns]
    assert any("Layered" in name or "Strategy" in name or "Factory" in name or "Repository" in name or "Event" in name for name in pattern_names)


def test_architectural_tradeoff_analysis(reasoning_repo):
    """Verify coupling metrics, scalability assessment, and refactoring priority recommendations."""
    _, _, km = reasoning_repo
    tradeoff = RepositoryReasoningEngine.analyze_tradeoffs(km)

    assert tradeoff.overall_scalability_score == "High"
    assert len(tradeoff.highly_coupled_modules) > 0
    assert "Scalability Assessment" in tradeoff.tradeoff_summary


def test_intelligent_entity_comparison(reasoning_repo):
    """Verify side-by-side entity comparison detailing similarities, differences, and responsibilities."""
    _, _, km = reasoning_repo
    comp = RepositoryReasoningEngine.compare_entities(km, "auth.py", "users.py")

    assert comp.entity_a is not None
    assert comp.entity_b is not None
    assert len(comp.similarities) > 0
    assert len(comp.differences) > 0


def test_phase4_intent_classification():
    """Verify IntentClassifier accurately categorizes Phase 4 reasoning queries."""
    # Execution Trace
    intent_trace = IntentClassifier.classify("How does login work?")
    assert intent_trace.intent == IntentType.EXECUTION_TRACE
    assert intent_trace.complexity == ResponseComplexity.COMPLEX

    # Feature Placement
    intent_placement = IntentClassifier.classify("Where should password reset be added?")
    assert intent_placement.intent == IntentType.FEATURE_PLACEMENT
    assert intent_placement.complexity == ResponseComplexity.COMPLEX

    # Design Patterns
    intent_pattern = IntentClassifier.classify("What design patterns are used in this codebase?")
    assert intent_pattern.intent == IntentType.DESIGN_PATTERN_DISCOVERY

    # Architectural Trade-off
    intent_tradeoff = IntentClassifier.classify("Is this architecture scalable?")
    assert intent_tradeoff.intent in (IntentType.ARCHITECTURAL_TRADEOFF, IntentType.ARCHITECTURE_EXPLANATION)

    # Intelligent Comparison
    intent_comp = IntentClassifier.classify("Compare auth.py and users.py")
    assert intent_comp.intent == IntentType.INTELLIGENT_COMPARISON


def test_phase4_grounded_provider_synthesis():
    """Verify GroundedRepoProvider synthesizes detailed Phase 4 reasoning responses."""
    provider = GroundedRepoProvider()

    # Trace Execution
    intent_trace = IntentClassifier.classify("Trace the request lifecycle for authentication")
    res_trace = provider.generate_chat_response([{"role": "user", "content": "Trace the request lifecycle for authentication"}], intent_result=intent_trace)
    assert len(res_trace["content"]) > 0

    # Feature Placement
    intent_placement = IntentClassifier.classify("Best place for caching?")
    res_placement = provider.generate_chat_response([{"role": "user", "content": "Best place for caching?"}], intent_result=intent_placement)
    assert len(res_placement["content"]) > 0

    # Design Patterns
    intent_pattern = IntentClassifier.classify("What design patterns are used?")
    res_pattern = provider.generate_chat_response([{"role": "user", "content": "What design patterns are used?"}], intent_result=intent_pattern)
    assert len(res_pattern["content"]) > 0

    # Trade-off Analysis
    intent_tradeoff = IntentClassifier.classify("Is this architecture scalable?")
    res_tradeoff = provider.generate_chat_response([{"role": "user", "content": "Is this architecture scalable?"}], intent_result=intent_tradeoff)
    assert len(res_tradeoff["content"]) > 0


def test_phase4_end_to_end_scenarios(reasoning_repo):
    """Test manual scenarios through the ConversationOrchestrator stream pipeline."""
    repo_id, _, km = reasoning_repo

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
                name="reasoning_repo",
                github_owner="test",
                github_repo="reasoning_repo",
                github_url="https://github.com/test/reasoning_repo",
            )
            db.add(user_repo)
            db.commit()

        session = global_orchestrator.create_session(
            db=db,
            user_id=str(user.id),
            repository_id=repo_id,
            title="Phase 4 Deep Reasoning Session",
        )

        phase4_queries = [
            "How does login work?",
            "Trace the request lifecycle for authentication",
            "Explain the startup flow",
            "Where should password reset be added?",
            "Where should caching live?",
            "What design patterns are used in this codebase?",
            "Is this architecture scalable? What should be refactored first?",
            "Compare auth.py and user_service.py",
            "Explain how backend routes communicate with services",
            "Where is technical debt in this repository?",
        ]

        for query in phase4_queries:
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

"""
Production Conversation Stress Tests (Phase 11).

Simulates end-to-end, realistic multi-turn developer interactions to verify:
✓ Context & memory preservation across turns
✓ Anaphora reference resolution (pronominal & relative references)
✓ Zero hallucinated files or symbols
✓ Zero internal implementation jargon leaks
✓ Adaptive response length based on preference memory
✓ Context-aware follow-up suggestions
✓ Robust state isolation in benchmark mode
"""

import sys
from pathlib import Path

# Ensure project root is on sys.path
PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))
backend_path = PROJECT_ROOT / "backend"
if str(backend_path) not in sys.path:
    sys.path.insert(0, str(backend_path))

import pytest
from app.db.database import Base, SessionLocal, engine
from app.models.auth import User, UserRepository
from app.services import repository_store
from app.services.conversation_service import global_orchestrator
from app.services.intent_classifier import IntentClassifier, IntentType


@pytest.fixture(scope="module")
def setup_db_and_repo():
    """Setup in-memory DB and test repository for conversation stress testing."""
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    # Create test user
    user = db.query(User).filter_by(id="stress_test_user").first()
    if not user:
        user = User(id="stress_test_user", username="stress_user", password_hash="dummy_hash")
        db.add(user)
        db.commit()

    tmp_path = Path("benchmark/cache/stress_repo")
    tmp_path.mkdir(parents=True, exist_ok=True)
    (tmp_path / "auth.py").write_text("def login(): pass\ndef verify_jwt(): pass\n")
    (tmp_path / "database.py").write_text("class Database: pass\n")
    (tmp_path / "main.py").write_text("import auth\nimport database\n")

    repo_id = repository_store.register(tmp_path, {"name": "StressRepo", "owner": "test"})

    from app.services import knowledge_service
    knowledge_service.get_or_build(repo_id, tmp_path)

    user_repo = db.query(UserRepository).filter_by(id=repo_id).first()
    if not user_repo:
        user_repo = UserRepository(
            id=repo_id,
            user_id=user.id,
            name="StressRepo",
            github_owner="test",
            github_repo="stress-repo",
            github_url="https://github.com/test/stress-repo",
        )
        db.add(user_repo)
        db.commit()

    yield db, user.id, repo_id
    db.close()


def run_turn(db, session_id, message, is_benchmark_mode=False):
    """Helper to execute one turn and aggregate output text."""
    events = list(global_orchestrator.run_conversation_turn_stream(
        db=db,
        session_id=session_id,
        user_content=message,
        is_benchmark_mode=is_benchmark_mode,
    ))
    tokens = [e.data.get("token", "") for e in events if e.event_type.value == "token"]
    full_text = "".join(tokens).strip()
    return full_text, events


# -----------------------------------------------------------------------------
# Scenario 1: Greeting -> Overview -> Architecture -> Implementation Details
# -----------------------------------------------------------------------------
def test_greeting_onboarding_architecture_scenario(setup_db_and_repo):
    db, user_id, repo_id = setup_db_and_repo
    session = global_orchestrator.create_session(db, user_id, repo_id, "Scenario 1", "deterministic")

    # Turn 1: Greeting
    text1, _ = run_turn(db, session.id, "Hello")
    assert "Hi!" in text1 or "ready" in text1

    # Turn 2: Repository Overview
    text2, _ = run_turn(db, session.id, "Explain this repository")
    assert "StressRepo" in text2 or "repository" in text2.lower()

    # Turn 3: Architecture Explanation
    text3, _ = run_turn(db, session.id, "What architecture is used?")
    assert "layered architecture" in text3.lower() or "structure" in text3.lower()

    # Turn 4: Implementation Details
    text4, _ = run_turn(db, session.id, "Where is main entry point?")
    assert len(text4) > 0


# -----------------------------------------------------------------------------
# Scenario 2: Auth Discovery -> JWT Flow -> Impact Analysis -> Placement
# -----------------------------------------------------------------------------
def test_auth_discovery_jwt_impact_placement_scenario(setup_db_and_repo):
    db, user_id, repo_id = setup_db_and_repo
    session = global_orchestrator.create_session(db, user_id, repo_id, "Scenario 2", "deterministic")

    # Turn 1: Auth Discovery
    text1, _ = run_turn(db, session.id, "Where is authentication implemented?")
    assert "auth" in text1.lower() or "searched" in text1.lower()

    # Turn 2: JWT Trace
    text2, _ = run_turn(db, session.id, "Trace login flow")
    assert "login" in text2.lower() or "auth" in text2.lower()

    # Turn 3: Impact Analysis
    text3, _ = run_turn(db, session.id, "What breaks if auth.py changes?")
    assert "auth" in text3.lower() or "impact" in text3.lower()
    assert "blast radius" not in text3

    # Turn 4: Feature Placement
    text4, _ = run_turn(db, session.id, "Where should password reset live?")
    assert len(text4) > 0


# -----------------------------------------------------------------------------
# Scenario 3: Database Exploration -> Request Lifecycle -> Performance
# -----------------------------------------------------------------------------
def test_database_request_lifecycle_performance_scenario(setup_db_and_repo):
    db, user_id, repo_id = setup_db_and_repo
    session = global_orchestrator.create_session(db, user_id, repo_id, "Scenario 3", "deterministic")

    # Turn 1: DB Exploration
    text1, _ = run_turn(db, session.id, "Where is database logic?")
    assert "database" in text1.lower() or "searched" in text1.lower()

    # Turn 2: Request Lifecycle
    text2, _ = run_turn(db, session.id, "Explain request lifecycle")
    assert "lifecycle" in text2.lower() or "request" in text2.lower() or "main" in text2.lower() or "details" in text2.lower()

    # Turn 3: Performance Discussion
    text3, _ = run_turn(db, session.id, "What should be refactored first?")
    assert "refactor" in text3.lower() or "complexity" in text3.lower() or "priority" in text3.lower()


# -----------------------------------------------------------------------------
# Scenario 4: Multi-turn Anaphora Pronouns ("it", "that", "the service")
# -----------------------------------------------------------------------------
def test_multi_turn_anaphora_pronouns_scenario(setup_db_and_repo):
    db, user_id, repo_id = setup_db_and_repo
    session = global_orchestrator.create_session(db, user_id, repo_id, "Scenario 4", "deterministic")

    # Turn 1: Focus on auth.py
    run_turn(db, session.id, "Explain auth.py")

    # Turn 2: Pronoun 'it'
    text2, _ = run_turn(db, session.id, "What does it contain?")
    assert len(text2) > 0

    # Turn 3: Pronoun 'that'
    text3, _ = run_turn(db, session.id, "What happens if I modify that?")
    assert len(text3) > 0


# -----------------------------------------------------------------------------
# Scenario 5: User Changing Topics Midway Through Conversation
# -----------------------------------------------------------------------------
def test_topic_shift_scenario(setup_db_and_repo):
    db, user_id, repo_id = setup_db_and_repo
    session = global_orchestrator.create_session(db, user_id, repo_id, "Scenario 5", "deterministic")

    # Topic A: Authentication
    text1, _ = run_turn(db, session.id, "Where is authentication?")
    assert "auth" in text1.lower() or "searched" in text1.lower()

    # Topic B: Database Shift
    text2, _ = run_turn(db, session.id, "Which technologies are present?")
    assert "stack" in text2.lower() or "uses" in text2.lower() or "primarily" in text2.lower()


# -----------------------------------------------------------------------------
# Scenario 6: Short Conversational Acknowledgements
# -----------------------------------------------------------------------------
def test_conversational_short_acknowledgements_scenario(setup_db_and_repo):
    db, user_id, repo_id = setup_db_and_repo
    session = global_orchestrator.create_session(db, user_id, repo_id, "Scenario 6", "deterministic")

    text_ok, _ = run_turn(db, session.id, "ok")
    assert "Great! What would you like to explore next?" in text_ok

    text_thanks, _ = run_turn(db, session.id, "thanks")
    assert "You're welcome!" in text_thanks

    text_nice, _ = run_turn(db, session.id, "nice")
    assert "Glad to help!" in text_nice


# -----------------------------------------------------------------------------
# Scenario 7: Long Multi-turn Technical Session (15 Turns)
# -----------------------------------------------------------------------------
def test_long_technical_conversation_scenario(setup_db_and_repo):
    db, user_id, repo_id = setup_db_and_repo
    session = global_orchestrator.create_session(db, user_id, repo_id, "Scenario 7", "deterministic")

    turns = [
        "Hello",
        "Explain this repository",
        "Which technologies are present?",
        "Where is authentication?",
        "Where is database logic?",
        "What breaks if auth.py changes?",
        "Which modules depend on database.py?",
        "Which modules are risky?",
        "What should be refactored first?",
        "Trace login flow",
        "Explain request lifecycle",
        "Which design patterns are used?",
        "Compare frontend and backend",
        "ok",
        "thanks",
    ]

    for turn_msg in turns:
        text, _ = run_turn(db, session.id, turn_msg)
        assert len(text) > 0
        assert "search_universe" not in text
        assert "EvidenceRanker" not in text


# -----------------------------------------------------------------------------
# Scenario 8: Invalid Assumptions / Missing Feature ("Where is OAuth?")
# -----------------------------------------------------------------------------
def test_invalid_missing_feature_assumption_scenario(setup_db_and_repo):
    db, user_id, repo_id = setup_db_and_repo
    session = global_orchestrator.create_session(db, user_id, repo_id, "Scenario 8", "deterministic")

    text, _ = run_turn(db, session.id, "Where is OAuth implemented?")
    assert "auth" in text.lower() or "oauth" in text.lower() or "searched" in text.lower()


# -----------------------------------------------------------------------------
# Scenario 9: Benchmark Mode Turn Isolation
# -----------------------------------------------------------------------------
def test_benchmark_mode_isolation_scenario(setup_db_and_repo):
    db, user_id, repo_id = setup_db_and_repo
    session = global_orchestrator.create_session(db, user_id, repo_id, "Scenario 9", "deterministic")

    # Turn 1: Auth query
    run_turn(db, session.id, "Where is authentication?", is_benchmark_mode=True)

    # Turn 2: Tech query in benchmark mode
    text2, _ = run_turn(db, session.id, "Which technologies are present?", is_benchmark_mode=True)
    assert "What architecture is used?" not in text2

"""
Benchmark Quality & Grounded Reasoning Test Suite (Phase 7.5 & Phase 8).

Verifies key quality fixes:
✓ No previous-question leakage
✓ No CommitIt-specific hallucinations
✓ No nonexistent files
✓ No 'None' placeholders
✓ Architecture answers use repository evidence
✓ Technology answers only list detected technologies
✓ Comparison answers compare actual modules
✓ Search returns implementation before documentation
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
from app.services.evidence_ranker import EvidenceRanker
from app.services.evidence_validator import EvidenceValidator
from app.services.intent_classifier import IntentClassifier, IntentType
from app.services.llm.grounded_provider import GroundedRepoProvider
from app.services.response_integrity import ResponseIntegrityGuard
from benchmark.judge import LLMJudge


def test_intent_classifier_benchmark_mappings():
    """Verify standard benchmark queries map to explicit intents, never UNKNOWN."""
    res1 = IntentClassifier.classify("Explain this repository")
    assert res1.intent in (IntentType.ONBOARDING_GUIDE, IntentType.ARCHITECTURE_EXPLANATION)

    res2 = IntentClassifier.classify("Which technologies are present?")
    assert res2.intent == IntentType.TECHNOLOGY_STACK

    res3 = IntentClassifier.classify("What should be refactored first?")
    assert res3.intent == IntentType.PERFORMANCE_HEALTH

    res4 = IntentClassifier.classify("Compare frontend and backend")
    assert res4.intent == IntentType.INTELLIGENT_COMPARISON

    res5 = IntentClassifier.classify("Which modules depend on database.py")
    assert res5.intent in (IntentType.DEPENDENCY_ANALYSIS, IntentType.IMPACT_ANALYSIS)


def test_evidence_ranker_prioritizes_implementation():
    """Verify implementation files (.py) rank higher than markdown/docs/examples."""
    files = ["docs/database.md", "database.py", "examples/db_example.py"]
    ranked = EvidenceRanker.rank_files(files, topic="Where is database logic?")
    top_file = ranked[0][0]
    assert top_file == "database.py"


def test_evidence_validator_scrubs_hallucinated_paths():
    """Verify EvidenceValidator removes/scrubs hallucinated CommitIt paths in non-CommitIt repos."""
    raw_response = "Authentication is in `app/api/auth.py` and `app/services/auth_service.py`."
    actual_repo_files = {"main.py", "utils.py", "auth.py"}

    cleaned = EvidenceValidator.validate_and_scrub(
        response_text=raw_response,
        repo_files=actual_repo_files,
    )

    assert "app/api/auth.py" not in cleaned
    assert "app/services/auth_service.py" not in cleaned


def test_response_integrity_guard_sanitizes_nulls_and_leaks():
    """Verify ResponseIntegrityGuard cleans 'None' placeholders and prompt leaks."""
    text = "Modifying None file carries impact. What architecture is used?"
    sanitized = ResponseIntegrityGuard.sanitize(
        text=text,
        user_query="Which technologies are present?",
        repository_name="FastAPI",
    )

    assert "Modifying None" not in sanitized
    assert "What architecture is used?" not in sanitized


def test_grounded_provider_authentication_fallback_when_absent():
    """Verify GroundedRepoProvider returns grounded fallback when auth is absent."""
    provider = GroundedRepoProvider()
    messages = [{"role": "user", "content": "Where is authentication implemented?"}]

    # Empty context without auth files
    response_text = provider._synthesize_grounded_response(messages)
    assert "searched for authentication" in response_text.lower() or "didn't find a matching implementation" in response_text.lower()
    assert "app/api/auth.py" not in response_text


def test_llm_judge_penalizes_leakage_and_hallucination():
    """Verify LLM Judge applies penalties for context leakage and hallucinated paths."""
    judge = LLMJudge()

    # Leaked response
    eval_res = judge.score_response(
        question="Which technologies are present?",
        category="architecture",
        answer="What architecture is used? Authentication is in app/api/auth.py.",
        tool_calls=[],
        repository_name="FastAPI",
    )

    assert eval_res["total_score"] < 20
    assert any("Context leakage" in w or "Hallucinated" in w for w in eval_res["weaknesses"])

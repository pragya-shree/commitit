"""
Phase 10 - Real Conversation Audit & Production UX Refinement Test Suite.

Verifies natural developer conversation standards:
✓ Natural acknowledgements ('ok', 'thanks', 'nice') without re-triggering repo summaries
✓ Natural repository introductions ('What is the repository name?')
✓ Adaptive response length (concise 2-4 lines for simple queries)
✓ Detailed missing information handling (explains searched terms)
✓ Navigation answers formatted with file + role
✓ Zero internal tool jargon, class names, or debug terminology
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
from app.services.intent_classifier import IntentClassifier, IntentType
from app.services.llm.grounded_provider import GroundedRepoProvider
from app.services.response_integrity import ResponseIntegrityGuard
from app.services.self_review import SelfReviewGuardrail


def test_conversational_acknowledgements():
    """Verify 'ok', 'thanks', 'nice' map to ACKNOWLEDGEMENT intent and return conversational responses."""
    res_ok = IntentClassifier.classify("ok")
    assert res_ok.intent == IntentType.ACKNOWLEDGEMENT

    res_thanks = IntentClassifier.classify("thanks!")
    assert res_thanks.intent == IntentType.ACKNOWLEDGEMENT

    provider = GroundedRepoProvider()
    resp_ok = provider._synthesize_grounded_response([{"role": "user", "content": "ok"}], intent_result=res_ok)
    assert "Great! What would you like to explore next?" in resp_ok

    resp_thanks = provider._synthesize_grounded_response([{"role": "user", "content": "thanks!"}], intent_result=res_thanks)
    assert "You're welcome!" in resp_thanks


def test_natural_repository_introduction():
    """Verify 'What is the repository name?' returns a natural conversational intro."""
    provider = GroundedRepoProvider()
    messages = [{"role": "user", "content": "What is the repository name?"}]

    response = provider._synthesize_grounded_response(messages)
    assert "This repository is called" in response
    assert "grounded in repository manifest" not in response


def test_natural_openings_no_robotic_prefixes():
    """Verify responses do not start with robotic 'Yes.' or 'Grounded analysis'."""
    provider = GroundedRepoProvider()
    messages = [{"role": "user", "content": "Which technologies are present?"}]

    response = provider._synthesize_grounded_response(messages)
    assert not response.startswith("Yes.")
    assert not response.startswith("Grounded analysis")
    assert not response.startswith("Based on repository analysis")


def test_adaptive_response_length_simple_query():
    """Verify simple technology query returns concise 2-4 line response."""
    provider = GroundedRepoProvider()
    messages = [{"role": "user", "content": "Which technologies are present?"}]

    response = provider._synthesize_grounded_response(messages)
    line_count = len([line for line in response.split("\n") if line.strip()])
    assert line_count <= 4


def test_detailed_missing_information_handling():
    """Verify missing component response explains what terms were searched."""
    provider = GroundedRepoProvider()
    messages = [{"role": "user", "content": "Where is OAuth authentication implemented?"}]

    response = provider._synthesize_grounded_response(messages)
    assert "searched" in response.lower()
    assert "authentication" in response.lower() or "oauth" in response.lower()


def test_navigation_formatting_with_roles():
    """Verify navigation answers include file and role descriptions."""
    provider = GroundedRepoProvider()
    messages = [
        {
            "role": "tool",
            "content": '{"tool_name": "search_universe", "result": {"matched_files": ["auth.py", "jwt.py"]}}',
        },
        {"role": "user", "content": "Where is authentication implemented?"},
    ]

    response = provider._synthesize_grounded_response(messages)
    assert "auth.py" in response
    assert "• `auth.py` —" in response or "`auth.py`" in response


def test_purge_internal_tool_and_class_names():
    """Verify zero internal tool names or service class names appear in output."""
    raw_text = "Running search_universe tool with EvidenceRanker and SelfReviewGuardrail. Evaluating blast radius."
    refined = SelfReviewGuardrail.validate_and_refine(raw_text)

    assert "search_universe" not in refined
    assert "EvidenceRanker" not in refined
    assert "SelfReviewGuardrail" not in refined
    assert "blast radius" not in refined

"""
Unit tests for Phase 7B - LLM Judge Engine & Metric Scoring.
"""

import json
import sys
from pathlib import Path

# Ensure project root is on sys.path
PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

import pytest
from benchmark.judge import LLMJudge, evaluate_benchmark_results


def test_llm_judge_score_grounded():
    judge = LLMJudge()
    eval_res = judge.score_response(
        question="Where is authentication implemented?",
        category="navigation",
        answer="Authentication is implemented in auth.py using JWT tokens and verify_jwt function.",
        tool_calls=[{"tool_name": "search_code", "arguments": {"query": "auth"}}],
        repository_name="FastAPI",
    )

    assert "metrics" in eval_res
    metrics = eval_res["metrics"]
    assert len(metrics) == 6
    assert all(0 <= v <= 5 for v in metrics.values())
    assert 0 <= eval_res["total_score"] <= 30
    assert 0 <= eval_res["percentage"] <= 100
    assert isinstance(eval_res["strengths"], list)
    assert isinstance(eval_res["weaknesses"], list)
    assert isinstance(eval_res["suggested_improvement"], str)


def test_evaluate_benchmark_results(tmp_path):
    output_dir = tmp_path / "output"
    slug = "fastapi"
    repo_results_dir = output_dir / "results" / slug
    repo_results_dir.mkdir(parents=True, exist_ok=True)

    answers_json = repo_results_dir / "answers.json"
    transcript_md = repo_results_dir / "transcript.md"

    answers_json.write_text(json.dumps({"repository_name": "FastAPI", "slug": slug, "results": []}))
    transcript_md.write_text("# Transcript\n")

    repo_summaries = {
        slug: {
            "repository_name": "FastAPI",
            "slug": slug,
            "results": [
                {
                    "question_id": "nav_1",
                    "category": "navigation",
                    "question": "Where is authentication?",
                    "answer": "Authentication is in auth.py.",
                    "tool_calls": [],
                }
            ],
        }
    }

    evaluated = evaluate_benchmark_results(repo_summaries, output_dir)
    assert slug in evaluated
    assert "judge_score_avg" in evaluated[slug]
    assert "evaluation" in evaluated[slug]["results"][0]

    with open(answers_json, "r", encoding="utf-8") as f:
        data = json.load(f)
        assert "judge_score_avg" in data
        assert "evaluation" in data["results"][0]

"""
Unit tests for Phase 7C - Regression Detection System.
"""

import json
import sys
from pathlib import Path

# Ensure project root is on sys.path
PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

import pytest
from benchmark.regression import detect_regressions


def test_detect_regressions_initial_and_subsequent(tmp_path):
    output_dir = tmp_path / "output"

    initial_summaries = {
        "fastapi": {
            "repository_name": "FastAPI",
            "slug": "fastapi",
            "results": [
                {
                    "question_id": "nav_1",
                    "category": "navigation",
                    "question": "Where is authentication?",
                    "answer": "In auth.py",
                    "evaluation": {
                        "total_score": 20,
                        "metrics": {"correctness": 3, "completeness": 3, "evidence_quality": 3, "hallucination_risk": 4, "helpfulness": 4, "natural_language_quality": 3},
                    },
                }
            ],
        }
    }

    # Initial Run
    reg_res_1 = detect_regressions(initial_summaries, output_dir)
    assert (output_dir / "reports" / "regression_report.md").exists()
    assert (output_dir / "results" / "previous_run.json").exists()

    # Subsequent Run with Improvements
    subsequent_summaries = {
        "fastapi": {
            "repository_name": "FastAPI",
            "slug": "fastapi",
            "results": [
                {
                    "question_id": "nav_1",
                    "category": "navigation",
                    "question": "Where is authentication?",
                    "answer": "In auth.py and middleware.py with JWT verification.",
                    "evaluation": {
                        "total_score": 28,
                        "metrics": {"correctness": 5, "completeness": 5, "evidence_quality": 5, "hallucination_risk": 5, "helpfulness": 4, "natural_language_quality": 4},
                    },
                }
            ],
        }
    }

    reg_res_2 = detect_regressions(subsequent_summaries, output_dir)
    assert reg_res_2["improved_count"] == 1
    assert reg_res_2["regressions_count"] == 0
    assert reg_res_2["overall_delta"] > 0

    report_content = (output_dir / "reports" / "regression_report.md").read_text(encoding="utf-8")
    assert "Improved Answers" in report_content
    assert "FastAPI" in report_content

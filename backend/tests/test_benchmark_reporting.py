"""
Unit tests for Phase 7D - Quality Dashboard & Visual SVG Charting Engine.
"""

import json
import sys
from pathlib import Path

# Ensure project root is on sys.path
PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

import pytest
from benchmark.reporter import generate_reports
from benchmark.charts import generate_charts


def test_generate_reports_and_charts(tmp_path):
    output_dir = tmp_path / "output"

    repo_summaries = {
        "fastapi": {
            "repository_name": "FastAPI",
            "slug": "fastapi",
            "judge_score_percentage": 95.0,
            "results": [
                {
                    "question_id": "arch_1",
                    "category": "architecture",
                    "question": "Explain this repository.",
                    "answer": "FastAPI architecture overview.",
                    "latency_seconds": 1.1,
                    "tool_calls": [{"tool_name": "search_code", "status": "success"}],
                    "evaluation": {
                        "total_score": 28,
                        "max_score": 30,
                        "metrics": {"hallucination_risk": 5},
                    },
                }
            ],
        }
    }

    eval_data = generate_reports(repo_summaries, output_dir)
    assert eval_data["overall_score"] > 0
    assert (output_dir / "report.md").exists()
    assert (output_dir / "reports" / "report.md").exists()
    assert (output_dir / "reports" / "evaluation.json").exists()

    chart_files = generate_charts(repo_summaries, output_dir)
    assert len(chart_files) == 7
    for cf in chart_files:
        assert cf.exists()
        assert cf.name.endswith(".svg")
        content = cf.read_text(encoding="utf-8")
        assert "<svg" in content

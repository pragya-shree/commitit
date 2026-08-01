"""
Unit tests for Phase 7A - Core Benchmark Runner & Dataset Infrastructure.
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

import json
import pytest

from benchmark.runner import (
    load_yaml_config,
    slugify,
    init_benchmark_db,
    clone_or_prepare_repo,
    register_and_analyze,
    run_benchmark_for_repository,
    run_benchmark,
)


def test_slugify():
    assert slugify("FastAPI") == "fastapi"
    assert slugify("React Core App!") == "react_core_app"
    assert slugify("Flask - Microframework") == "flask_microframework"


def test_load_yaml_config(tmp_path):
    yaml_file = tmp_path / "test.yaml"
    yaml_file.write_text("repositories:\n  - name: TestRepo\n")
    config = load_yaml_config(yaml_file)
    assert "repositories" in config
    assert config["repositories"][0]["name"] == "TestRepo"


def test_prepare_repo(tmp_path):
    repo_info = {"name": "TestRepo"}
    cache_dir = tmp_path / "cache"
    prepared_path = clone_or_prepare_repo(repo_info, cache_dir)
    assert prepared_path.exists()
    assert (prepared_path / "auth.py").exists()
    assert (prepared_path / "main.py").exists()


def test_register_and_analyze(tmp_path):
    _, db = init_benchmark_db()
    repo_dir = tmp_path / "sample_repo"
    repo_dir.mkdir()
    (repo_dir / "app.py").write_text("print('hello')\n")

    repo_id = register_and_analyze("sample_repo", repo_dir, db)
    assert repo_id is not None
    assert len(repo_id) > 0
    db.close()


def test_run_benchmark_for_repository(tmp_path):
    _, db = init_benchmark_db()
    repo_info = {"name": "SampleFastAPI"}
    questions_config = {
        "architecture": ["Explain this repository."],
        "navigation": ["Where is authentication implemented?"],
    }

    output_dir = tmp_path / "output"
    cache_dir = tmp_path / "cache"

    result = run_benchmark_for_repository(
        repo_info=repo_info,
        questions_config=questions_config,
        db=db,
        output_base_dir=output_dir,
        cache_dir=cache_dir,
    )

    assert result["repository_name"] == "SampleFastAPI"
    assert result["total_questions"] == 2
    assert len(result["results"]) == 2

    # Verify generated artifact files
    answers_json = output_dir / "results" / "samplefastapi" / "answers.json"
    transcript_md = output_dir / "results" / "samplefastapi" / "transcript.md"

    assert answers_json.exists()
    assert transcript_md.exists()

    with open(answers_json, "r", encoding="utf-8") as f:
        data = json.load(f)
        assert data["repository_name"] == "SampleFastAPI"
        assert len(data["results"]) == 2

    db.close()

"""
Tests for Python code parsing (Milestone 4A).
"""

from fastapi.testclient import TestClient

from app.main import app
from app.services.parser_service import parse_repository
from app.services.repository_store import register

client = TestClient(app)


SAMPLE_MODULE = '''\
"""Module docstring."""
import os
from typing import Optional, List


class Greeter:
    """Greets people politely."""

    def __init__(self, name: str) -> None:
        """Store the name."""
        self.name = name

    @staticmethod
    def shout(message: str, times: int = 1) -> str:
        """Repeat a message loudly."""
        return (message.upper() + "!") * times


def add(a: int, b: int) -> int:
    """Add two numbers."""
    return a + b


async def fetch(url: str, *args, retries: int = 3, **kwargs) -> Optional[str]:
    return None
'''


def _make_sample_repo(tmp_path):
    """Build a small fake repository with Python and non-Python files."""
    (tmp_path / "app").mkdir()
    (tmp_path / "app" / "greeter.py").write_text(SAMPLE_MODULE)
    (tmp_path / "app" / "broken.py").write_text("def oops(:\n    pass")  # syntax error
    (tmp_path / "README.md").write_text("# Not Python")

    ignored = tmp_path / "venv"
    ignored.mkdir()
    (ignored / "lib.py").write_text("import sys")

    return tmp_path


def test_parse_repository_service_directly(tmp_path):
    repo_path = _make_sample_repo(tmp_path)
    result = parse_repository(repo_path)

    # broken.py should be skipped due to SyntaxError; venv/lib.py ignored.
    assert result["total_files"] == 1

    module = result["modules"][0]
    assert module["path"] == "app/greeter.py"
    assert module["docstring"] == "Module docstring."
    assert "os" in module["imports"]
    assert "typing.Optional" in module["imports"]
    assert "typing.List" in module["imports"]

    assert len(module["classes"]) == 1
    cls = module["classes"][0]
    assert cls["name"] == "Greeter"
    assert cls["docstring"] == "Greets people politely."
    method_names = {m["name"] for m in cls["methods"]}
    assert method_names == {"__init__", "shout"}

    shout = next(m for m in cls["methods"] if m["name"] == "shout")
    assert shout["decorators"] == ["staticmethod"]
    assert shout["returns"] == "str"
    arg_names = [a["name"] for a in shout["args"]]
    assert arg_names == ["message", "times"]

    top_level_names = {f["name"] for f in module["functions"]}
    assert top_level_names == {"add", "fetch"}

    fetch_fn = next(f for f in module["functions"] if f["name"] == "fetch")
    fetch_arg_names = [a["name"] for a in fetch_fn["args"]]
    assert "*args" in fetch_arg_names
    assert "**kwargs" in fetch_arg_names
    assert "retries" in fetch_arg_names


def test_parse_ignores_and_skips_are_counted_correctly(tmp_path):
    repo_path = _make_sample_repo(tmp_path)
    result = parse_repository(repo_path)

    assert result["total_classes"] == 1
    assert result["total_functions"] == 4  # __init__, shout, add, fetch
    assert result["total_imports"] == 3  # os, typing.Optional, typing.List


def test_parse_endpoint_success(tmp_path):
    repo_path = _make_sample_repo(tmp_path)
    repository_id = register(repo_path)

    response = client.get(f"/api/v1/repository/{repository_id}/parse")
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["repository_id"] == repository_id
    assert data["summary"]["total_files"] == 1
    assert data["summary"]["total_classes"] == 1
    assert len(data["modules"]) == 1


def test_parse_endpoint_unknown_repository_id():
    response = client.get("/api/v1/repository/cmt_doesnotexist/parse")
    assert response.status_code == 404


def test_parse_endpoint_path_missing(tmp_path):
    repo_path = tmp_path / "gone"
    repo_path.mkdir()
    repository_id = register(repo_path)
    repo_path.rmdir()

    response = client.get(f"/api/v1/repository/{repository_id}/parse")
    assert response.status_code == 410


def test_parse_empty_repository(tmp_path):
    empty_repo = tmp_path / "empty"
    empty_repo.mkdir()

    result = parse_repository(empty_repo)
    assert result["total_files"] == 0
    assert result["modules"] == []
    assert result["total_classes"] == 0
    assert result["total_functions"] == 0
    assert result["total_imports"] == 0


def test_parse_skips_non_python_files(tmp_path):
    (tmp_path / "notes.txt").write_text("hello")
    (tmp_path / "script.py").write_text("x = 1")

    result = parse_repository(tmp_path)
    assert result["total_files"] == 1
    assert result["modules"][0]["path"] == "script.py"

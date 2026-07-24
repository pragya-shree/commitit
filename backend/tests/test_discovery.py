"""
Unit tests for the Recent Discoveries engine.
"""

import time
from pathlib import Path
from unittest.mock import MagicMock, patch

from app.models.technology import TechnologyEntry
from app.models.health import HealthIndicator
from app.services.discovery_service import (
    format_relative_time,
    generate_discoveries,
)


def test_format_relative_time():
    """Test human-readable relative time formatting."""
    now = int(time.time())
    
    assert format_relative_time(now - 10) == "just now"
    assert format_relative_time(now - 120) == "2 minutes ago"
    assert format_relative_time(now - 3600) == "1 hour ago"
    assert format_relative_time(now - 7200) == "2 hours ago"
    assert format_relative_time(now - 86400) == "1 day ago"
    assert format_relative_time(now - 172800) == "2 days ago"


@patch("app.services.discovery_service.Repo")
def test_generate_discoveries_git_commits(mock_repo_class, tmp_path):
    """Test generating discovery entries from git history commits."""
    # Set up mock commits
    mock_commit1 = MagicMock()
    mock_commit1.hexsha = "abcdef123456"
    mock_commit1.summary = "Initial commit"
    mock_commit1.author.name = "John Doe"
    mock_commit1.committed_date = int(time.time()) - 300  # 5 mins ago
    
    mock_commit2 = MagicMock()
    mock_commit2.hexsha = "123456abcdef"
    mock_commit2.summary = "Fix some bugs"
    mock_commit2.author.name = "Jane Smith"
    mock_commit2.committed_date = int(time.time()) - 3600  # 1 hour ago
    
    mock_repo = MagicMock()
    mock_repo.iter_commits.return_value = [mock_commit1, mock_commit2]
    mock_repo.active_branch.name = "main"
    mock_repo_class.return_value = mock_repo

    discoveries = generate_discoveries(tmp_path, [], [])
    
    assert len(discoveries) == 2
    assert discoveries[0].id == "git-abcdef1"
    assert "Initial commit" in discoveries[0].title
    assert "John Doe" in discoveries[0].description
    assert discoveries[0].timestamp == "5 minutes ago"
    assert discoveries[0].icon == "Activity"
    assert discoveries[0].color == "magenta"


def test_generate_discoveries_technologies_and_health(tmp_path):
    """Test generating discoveries from technologies and architecture health indicators."""
    # Setup mock inputs
    technologies = [
        TechnologyEntry(name="FastAPI", category="framework"),
        TechnologyEntry(name="Docker", category="infrastructure"),
        TechnologyEntry(name="Python", category="language"),  # should be skipped (languages are ignored)
    ]
    
    health_indicators = [
        HealthIndicator(
            id="architecture",
            label="Architecture complexity",
            score=95,  # high score triggers highly modular praise
            status="excellent",
            description="Clear module boundaries"
        )
    ]
    
    # Write a dummy README to trigger README discovery
    (tmp_path / "README.md").write_text("# Project")

    # Mock Repo to raise Exception (simulate no git history)
    with patch("app.services.discovery_service.Repo", side_effect=Exception("No git repo")):
        discoveries = generate_discoveries(tmp_path, technologies, health_indicators)
        
    names = {d.id for d in discoveries}
    assert "tech-docker" in names
    assert "tech-fastapi" in names
    assert "doc-readme" in names
    assert "arch-acyclic" in names
    
    # Check that they are sorted correctly (technologies first, then landmarks)
    # Priority for tech is 2, for landmarks is 3
    assert discoveries[0].id == "tech-docker"
    assert discoveries[1].id == "tech-fastapi"
    assert discoveries[2].id == "arch-acyclic"
    assert discoveries[3].id == "doc-readme"


@patch("app.services.discovery_service.Repo")
def test_generate_discoveries_sorting_and_capping(mock_repo_class, tmp_path):
    """Test that discoveries are sorted correctly and capped at 5 total entries."""
    # 3 git commits
    mock_commits = []
    for i in range(3):
        c = MagicMock()
        c.hexsha = f"hexsha{i}"
        c.summary = f"Commit {i}"
        c.author.name = f"User {i}"
        c.committed_date = int(time.time()) - (i * 100)
        mock_commits.append(c)
        
    mock_repo = MagicMock()
    mock_repo.iter_commits.return_value = mock_commits
    mock_repo_class.return_value = mock_repo
    
    # 3 technologies
    technologies = [
        TechnologyEntry(name="FastAPI", category="framework"),
        TechnologyEntry(name="React", category="framework"),
        TechnologyEntry(name="Docker", category="infrastructure"),
    ]
    
    # README present
    (tmp_path / "README.md").write_text("# Project")
    
    discoveries = generate_discoveries(tmp_path, technologies, [])
    # Total candidates: 3 commits + 3 technologies + 1 README = 7
    # Should be capped at 5
    assert len(discoveries) == 5
    
    # Order should be: 3 commits first, then 2 tech (docker, fastapi) - sorted alphabetically
    assert discoveries[0].id == "git-hexsha0"
    assert discoveries[1].id == "git-hexsha1"
    assert discoveries[2].id == "git-hexsha2"
    assert discoveries[3].id == "tech-docker"
    assert discoveries[4].id == "tech-fastapi"

"""
Recent Discoveries service.
Generates dynamic codebase event/landmark cards based on Git logs, technology integrations, and health metrics.
"""

from datetime import datetime, timezone
from pathlib import Path

from git import Repo

from app.core.logging import get_logger
from app.models.discovery import DiscoveryEntry

logger = get_logger(__name__)


def format_relative_time(epoch_timestamp: int) -> str:
    """Format an epoch timestamp as a human-friendly relative string."""
    now = datetime.now(timezone.utc).timestamp()
    diff = int(now - epoch_timestamp)
    
    if diff < 0:
        diff = 0
    if diff < 60:
        return "just now"
    elif diff < 3600:
        mins = diff // 60
        return f"{mins} minute{'s' if mins > 1 else ''} ago"
    elif diff < 86400:
        hours = diff // 3600
        return f"{hours} hour{'s' if hours > 1 else ''} ago"
    else:
        days = diff // 86400
        return f"{days} day{'s' if days > 1 else ''} ago"


def generate_discoveries(
    local_path: Path,
    technologies: list,
    health_indicators: list
) -> list[DiscoveryEntry]:
    """
    Scan the git log and codebase metrics to generate repository-specific discoveries.
    Returns a sorted list of DiscoveryEntry objects (capped at 5).
    """
    discoveries = []

    # 1. Git Commit Activity
    try:
        repo = Repo(local_path)
        commits = list(repo.iter_commits(max_count=3))
        branch = "main"
        try:
            branch = repo.active_branch.name
        except Exception:
            pass

        for commit in commits:
            summary = commit.summary or ""
            if isinstance(summary, bytes):
                summary = summary.decode("utf-8", errors="replace")
            else:
                summary = str(summary)
            if len(summary) > 60:
                summary = summary[:57] + "..."
            discoveries.append(
                DiscoveryEntry(
                    id=f"git-{commit.hexsha[:7]}",
                    title=f"Commit: {summary}",
                    description=f"Committed by {commit.author.name} on branch {branch}.",
                    icon="Activity",
                    color="magenta",
                    timestamp=format_relative_time(commit.committed_date)
                )
            )
    except Exception as e:
        logger.warning("Could not read Git history from %s: %s", local_path, e)

    # 2. Technology Discoveries
    tech_count = 0
    for tech in sorted(technologies, key=lambda t: t.name):
        if tech.category in ("framework", "infrastructure", "tooling"):
            discoveries.append(
                DiscoveryEntry(
                    id=f"tech-{tech.name.lower().replace(' ', '-')}",
                    title=f"{tech.name} integration detected",
                    description=f"Found evidence of {tech.name} in configuration or project manifest files.",
                    icon="Lightbulb",
                    color="amber",
                    timestamp="during analysis"
                )
            )
            tech_count += 1
            if tech_count >= 3:
                break

    # 3. Quality & Layout Landmark Discoveries
    # README presence
    readme_exists = False
    try:
        for f in local_path.iterdir():
            if f.is_file() and f.name.lower().startswith("readme"):
                readme_exists = True
                break
    except OSError:
        pass

    if readme_exists:
        discoveries.append(
            DiscoveryEntry(
                id="doc-readme",
                title="Project README available",
                description="Found root-level README.md providing onboarding documentation.",
                icon="BookOpen",
                color="cyan",
                timestamp="during analysis"
            )
        )

    # Health highlights
    for ind in health_indicators:
        if ind.id == "architecture":
            if ind.score >= 90:
                discoveries.append(
                    DiscoveryEntry(
                        id="arch-acyclic",
                        title="Highly modular architecture",
                        description="The codebase features a clean dependency graph with high modularity.",
                        icon="Shapes",
                        color="mint",
                        timestamp="during analysis"
                    )
                )
            elif ind.score < 50:
                discoveries.append(
                    DiscoveryEntry(
                        id="arch-coupled",
                        title="Coupling warnings detected",
                        description="Found significant dependency cycles or bottlenecks in code graph.",
                        icon="AlertCircle",
                        color="coral",
                        timestamp="during analysis"
                    )
                )

    # Sort stably: Git commits first (priority 1), then technologies (priority 2), then quality/layout landmarks (priority 3).
    # Commits preserve chronological insertion order; others are sorted alphabetically by ID.
    def get_priority(d):
        if d.id.startswith("git-"):
            return 1
        if d.id.startswith("tech-"):
            return 2
        return 3

    def get_sort_key(item):
        idx, d = item
        pri = get_priority(d)
        if pri == 1:
            return (pri, idx, "")
        else:
            return (pri, 0, d.id)

    indexed_discoveries = list(enumerate(discoveries))
    sorted_indexed = sorted(indexed_discoveries, key=get_sort_key)
    sorted_discoveries = [item[1] for item in sorted_indexed]
    return sorted_discoveries[:5]

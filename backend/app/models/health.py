"""
Pydantic models for the Repository Health analysis system.
"""

from pydantic import BaseModel


class HealthIndicator(BaseModel):
    """A scored health metric describing one aspect of a repository."""

    id: str
    label: str
    score: int
    status: str  # "excellent" | "good" | "fair" | "needs-attention"
    description: str


class RepositoryHealth(BaseModel):
    """Aggregate collection of health indicators and an overall repository score."""

    overall_score: int
    indicators: list[HealthIndicator]

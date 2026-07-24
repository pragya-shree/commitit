"""
Pydantic models for the Technology Stack detection system.
"""

from pydantic import BaseModel


class TechnologyEntry(BaseModel):
    """A detected technology, including languages, frameworks, tooling, and infrastructure."""

    name: str
    category: str  # "language" | "framework" | "tooling" | "infrastructure"

"""
Pydantic models for the Recent Discoveries system.
"""

from pydantic import BaseModel


class DiscoveryEntry(BaseModel):
    """A single detected event, change, or characteristic in the repository."""

    id: str
    title: str
    description: str
    icon: str
    color: str
    timestamp: str

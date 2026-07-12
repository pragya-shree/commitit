"""
Pydantic models for the repository ingestion and scanning features.
"""

from pydantic import BaseModel, Field


class CloneRequest(BaseModel):
    """Request body for cloning a public GitHub repository."""

    github_url: str = Field(..., description="Public GitHub repository URL")


class RepositoryMetadata(BaseModel):
    """Metadata collected from a cloned repository. No local paths exposed."""

    owner: str
    name: str
    branch: str | None
    files: int
    directories: int
    size: str


class CloneResponse(BaseModel):
    """Response returned after a successful clone."""

    success: bool
    repository_id: str
    repository: RepositoryMetadata


class TreeNode(BaseModel):
    """A single node (file or directory) in the project tree."""

    name: str
    type: str  # "file" or "directory"
    children: list["TreeNode"] | None = None


class LargestFile(BaseModel):
    """A single entry in the largest-files list."""

    path: str
    extension: str
    size: int


class ScanSummary(BaseModel):
    """Basic counts from a repository scan."""

    total_files: int
    total_directories: int


class ScanResponse(BaseModel):
    """Response returned after scanning a repository."""

    success: bool
    repository_id: str
    summary: ScanSummary
    languages: dict[str, int]
    largest_files: list[LargestFile]
    tree: TreeNode

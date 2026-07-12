"""
Pydantic models for the Python code parsing feature (Milestone 4A).
"""

from pydantic import BaseModel


class ParsedArgument(BaseModel):
    """A single function/method argument."""

    name: str
    annotation: str | None = None


class ParsedFunction(BaseModel):
    """A top-level function or a class method."""

    name: str
    args: list[ParsedArgument] = []
    returns: str | None = None
    decorators: list[str] = []
    docstring: str | None = None


class ParsedClass(BaseModel):
    """A class definition, including its methods."""

    name: str
    bases: list[str] = []
    decorators: list[str] = []
    docstring: str | None = None
    methods: list[ParsedFunction] = []


class ParsedModule(BaseModel):
    """Structured metadata extracted from a single Python file."""

    path: str
    docstring: str | None = None
    imports: list[str] = []
    classes: list[ParsedClass] = []
    functions: list[ParsedFunction] = []


class ParseSummary(BaseModel):
    """Aggregate counts across the whole repository."""

    total_files: int
    total_classes: int
    total_functions: int
    total_imports: int


class ParseResponse(BaseModel):
    """Response returned after parsing a repository's Python source."""

    success: bool
    repository_id: str
    summary: ParseSummary
    modules: list[ParsedModule]

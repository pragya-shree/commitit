"""
API routes for version 1 of the CommitIt backend.
"""

from fastapi import APIRouter, HTTPException, Query

from app.models.context import ContextRequest, ContextResponse
from app.models.explanation import ExplanationRequest, ExplanationResponse
from app.models.graph import DependencyGraphResponse
from app.models.knowledge import KnowledgeResponse
from app.models.parser import ParseResponse
from app.models.query import (
    ClassesResponse,
    FilesResponse,
    FunctionsResponse,
    ImportsResponse,
    RelationshipsResponse,
    SearchResponse,
    SymbolsResponse,
)
from app.models.repository import CloneRequest, CloneResponse, ScanResponse
from app.services import context_service, explanation_service, query_service
from app.services.git_service import (
    CloneFailedError,
    InvalidRepositoryURLError,
    RepositoryNotFoundError,
    clone_repository,
)
from app.services.knowledge_service import KnowledgeNotBuiltError, get_or_build, get_required
from app.services.repository_store import (
    RepositoryPathMissingError,
    UnknownRepositoryIDError,
    resolve,
)

router = APIRouter()


@router.get("/health", summary="Health check", tags=["Health"])
def health_check() -> dict:
    """Return the current health status of the service."""
    return {"status": "healthy"}


@router.post(
    "/repository/clone",
    response_model=CloneResponse,
    summary="Clone a public GitHub repository",
    tags=["Repository"],
)
def clone_repo(request: CloneRequest) -> CloneResponse:
    """Validate, clone, and return metadata for a public GitHub repository."""
    try:
        result = clone_repository(request.github_url)
    except InvalidRepositoryURLError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except RepositoryNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except CloneFailedError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc

    return CloneResponse(
        success=True,
        repository_id=result["repository_id"],
        repository=result["metadata"],
    )


@router.get(
    "/repository/{repository_id}/scan",
    response_model=ScanResponse,
    summary="Scan a previously cloned repository",
    tags=["Repository"],
)
def scan_repo(repository_id: str) -> ScanResponse:
    """Scan a repository that was already cloned, identified by repository_id."""
    try:
        local_path = resolve(repository_id)
    except UnknownRepositoryIDError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except RepositoryPathMissingError as exc:
        raise HTTPException(status_code=410, detail=str(exc)) from exc

    try:
        model = get_or_build(repository_id, local_path)
    except OSError as exc:
        raise HTTPException(status_code=500, detail=f"Filesystem error while scanning: {exc}") from exc

    return ScanResponse(
        success=True,
        repository_id=repository_id,
        summary=model.scan_summary,
        languages=model.languages,
        largest_files=model.largest_files,
        tree=model.tree,
    )


@router.get(
    "/repository/{repository_id}/parse",
    response_model=ParseResponse,
    summary="Parse the Python source of a previously cloned repository",
    tags=["Repository"],
)
def parse_repo(repository_id: str) -> ParseResponse:
    """Parse Python files in a repository that was already cloned, via ast."""
    try:
        local_path = resolve(repository_id)
    except UnknownRepositoryIDError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except RepositoryPathMissingError as exc:
        raise HTTPException(status_code=410, detail=str(exc)) from exc

    try:
        model = get_or_build(repository_id, local_path)
    except OSError as exc:
        raise HTTPException(status_code=500, detail=f"Filesystem error while parsing: {exc}") from exc

    return ParseResponse(
        success=True,
        repository_id=repository_id,
        summary=model.parse_summary,
        modules=model.modules,
    )


@router.get(
    "/repository/{repository_id}/dependencies",
    response_model=DependencyGraphResponse,
    summary="Build a deterministic dependency graph for a previously cloned repository",
    tags=["Repository"],
)
def dependency_graph(repository_id: str) -> DependencyGraphResponse:
    """Build a graph of imports, inheritance, and calls for a cloned repository."""
    try:
        local_path = resolve(repository_id)
    except UnknownRepositoryIDError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except RepositoryPathMissingError as exc:
        raise HTTPException(status_code=410, detail=str(exc)) from exc

    try:
        model = get_or_build(repository_id, local_path)
    except OSError as exc:
        raise HTTPException(status_code=500, detail=f"Filesystem error while building graph: {exc}") from exc

    return DependencyGraphResponse(
        success=True,
        repository_id=repository_id,
        summary=model.graph_summary,
        nodes=model.nodes,
        edges=model.edges,
    )


@router.get(
    "/repository/{repository_id}/knowledge",
    response_model=KnowledgeResponse,
    summary="Get the complete Knowledge Model for a previously cloned repository",
    tags=["Repository"],
)
def knowledge(repository_id: str) -> KnowledgeResponse:
    """
    Return the full Knowledge Model (metadata, scan, parse, and dependency
    graph) for a repository. Built once and cached; later calls for the
    same repository_id return the cached model instead of rebuilding it.
    """
    try:
        local_path = resolve(repository_id)
    except UnknownRepositoryIDError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except RepositoryPathMissingError as exc:
        raise HTTPException(status_code=410, detail=str(exc)) from exc

    try:
        model = get_or_build(repository_id, local_path)
    except OSError as exc:
        raise HTTPException(
            status_code=500, detail=f"Filesystem error while building knowledge model: {exc}"
        ) from exc

    return KnowledgeResponse(success=True, knowledge=model)


def _get_knowledge_or_404(repository_id: str):
    """
    Pure read-only lookup for the query engine: never builds or rescans.
    404s if no Knowledge Model has been built yet for this repository_id.
    """
    try:
        return get_required(repository_id)
    except KnowledgeNotBuiltError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.get(
    "/repository/{repository_id}/query/symbols",
    response_model=SymbolsResponse,
    summary="Look up classes and functions by name",
    tags=["Query"],
)
def query_symbols(
    repository_id: str,
    name: str | None = Query(None, description="Case-insensitive substring filter"),
) -> SymbolsResponse:
    """Read-only lookup over the cached Knowledge Model. Never rebuilds."""
    model = _get_knowledge_or_404(repository_id)
    results = query_service.list_symbols(model, name)
    return SymbolsResponse(success=True, repository_id=repository_id, count=len(results), results=results)


@router.get(
    "/repository/{repository_id}/query/classes",
    response_model=ClassesResponse,
    summary="Look up classes by name",
    tags=["Query"],
)
def query_classes(
    repository_id: str,
    name: str | None = Query(None, description="Case-insensitive substring filter"),
) -> ClassesResponse:
    """Read-only lookup over the cached Knowledge Model. Never rebuilds."""
    model = _get_knowledge_or_404(repository_id)
    results = query_service.list_classes(model, name)
    return ClassesResponse(success=True, repository_id=repository_id, count=len(results), results=results)


@router.get(
    "/repository/{repository_id}/query/functions",
    response_model=FunctionsResponse,
    summary="Look up functions and methods by name",
    tags=["Query"],
)
def query_functions(
    repository_id: str,
    name: str | None = Query(None, description="Case-insensitive substring filter"),
) -> FunctionsResponse:
    """Read-only lookup over the cached Knowledge Model. Never rebuilds."""
    model = _get_knowledge_or_404(repository_id)
    results = query_service.list_functions(model, name)
    return FunctionsResponse(success=True, repository_id=repository_id, count=len(results), results=results)


@router.get(
    "/repository/{repository_id}/query/imports",
    response_model=ImportsResponse,
    summary="Look up import relationships by name",
    tags=["Query"],
)
def query_imports(
    repository_id: str,
    name: str | None = Query(None, description="Case-insensitive substring filter"),
) -> ImportsResponse:
    """Read-only lookup over the cached Knowledge Model. Never rebuilds."""
    model = _get_knowledge_or_404(repository_id)
    results = query_service.list_imports(model, name)
    return ImportsResponse(success=True, repository_id=repository_id, count=len(results), results=results)


@router.get(
    "/repository/{repository_id}/query/files",
    response_model=FilesResponse,
    summary="Look up files by path",
    tags=["Query"],
)
def query_files(
    repository_id: str,
    name: str | None = Query(None, description="Case-insensitive substring filter on path"),
) -> FilesResponse:
    """Read-only lookup over the cached Knowledge Model. Never rebuilds."""
    model = _get_knowledge_or_404(repository_id)
    results = query_service.list_files(model, name)
    return FilesResponse(success=True, repository_id=repository_id, count=len(results), results=results)


@router.get(
    "/repository/{repository_id}/query/relationships",
    response_model=RelationshipsResponse,
    summary="Look up incoming and outgoing dependency edges for a symbol",
    tags=["Query"],
)
def query_relationships(
    repository_id: str,
    symbol: str = Query(..., description="Symbol name to resolve (class, function, or module)"),
) -> RelationshipsResponse:
    """Read-only lookup over the cached Knowledge Model. Never rebuilds."""
    model = _get_knowledge_or_404(repository_id)
    relationships = query_service.get_relationships(model, symbol)
    return RelationshipsResponse(success=True, repository_id=repository_id, relationships=relationships)


@router.get(
    "/repository/{repository_id}/search",
    response_model=SearchResponse,
    summary="Search repository metadata, files, classes, functions, and imports",
    tags=["Query"],
)
def search_repository(
    repository_id: str,
    q: str = Query(..., description="Search query (case-insensitive substring match)"),
) -> SearchResponse:
    """Read-only aggregate search over the cached Knowledge Model. Never rebuilds."""
    model = _get_knowledge_or_404(repository_id)
    result = query_service.search(model, q)
    return SearchResponse(success=True, repository_id=repository_id, search=result)


@router.post(
    "/repository/{repository_id}/context",
    response_model=ContextResponse,
    summary="Build a deterministic AI context object for a natural-language question",
    tags=["Query"],
)
def build_context(repository_id: str, request: ContextRequest) -> ContextResponse:
    """
    Assemble a structured, LLM-ready context object for `question` from
    the cached Knowledge Model: the classes, functions, files, imports,
    and dependency relationships judged most relevant. Purely deterministic
    keyword matching over the Query Engine — no AI, no rebuild.
    """
    model = _get_knowledge_or_404(repository_id)
    context = context_service.build_context(model, request.question)
    return ContextResponse(success=True, repository_id=repository_id, context=context)


@router.post(
    "/repository/{repository_id}/explanation",
    response_model=ExplanationResponse,
    summary="Build a deterministic, human-readable explanation for a natural-language question",
    tags=["Query"],
)
def build_explanation(repository_id: str, request: ExplanationRequest) -> ExplanationResponse:
    """
    Assemble a structured, human-readable explanation for `question`:
    a repository overview, an architecture overview, and per-file/class/
    function/dependency explanations. Built entirely from Context Builder
    output (which itself comes from the cached Knowledge Model) — no AI,
    no filesystem access, no rebuild.
    """
    model = _get_knowledge_or_404(repository_id)
    context = context_service.build_context(model, request.question)
    explanation = explanation_service.explain(context)
    return ExplanationResponse(success=True, repository_id=repository_id, explanation=explanation)

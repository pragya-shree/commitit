"""
API routes for version 1 of the CommitIt backend.
"""

from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException, Query
from app.services.auth_service import require_repository_owner, get_current_user, get_optional_user, allow_repository_access
from app.models.auth import UserRepository, User
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.services.repository_store import compute_folder_stats
from app.core.config import settings

from app.core.logging import get_logger
from app.models.ai import AIExplainRequest, AIExplainResponse
from app.models.context import ContextRequest, ContextResponse
from app.models.explanation import ExplanationRequest, ExplanationResponse
from app.models.graph import DependencyGraphResponse
from app.models.impact import ImpactResponse
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
from app.services import context_service, explanation_service, impact_analysis_service, query_service
from app.services.git_service import (
    CloneFailedError,
    InvalidRepositoryURLError,
    RepositoryNotFoundError,
    clone_repository,
)
from app.services.knowledge_service import KnowledgeNotBuiltError, get_or_build, get_required
from app.services.llm import provider_factory
from app.services.llm.base import ProviderRequestError, ProviderUnavailableError, UnknownProviderError
from app.services.repository_store import (
    RepositoryPathMissingError,
    UnknownRepositoryIDError,
    resolve,
)

router = APIRouter()
from app.api.auth import router as auth_router
from app.api.users import router as users_router
router.include_router(auth_router)
router.include_router(users_router)
from app.api.ai_chat import router as ai_chat_router
router.include_router(ai_chat_router)
from app.api.dashboard import router as dashboard_router
router.include_router(dashboard_router)
from app.api.analysis import router as analysis_router
router.include_router(analysis_router)

logger = get_logger(__name__)


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
def clone_repo(
    request: CloneRequest,
    current_user: User | None = Depends(get_optional_user),
    db: Session = Depends(get_db),
) -> CloneResponse:
    """Validate, clone, and return metadata for a public GitHub repository."""
    user_id = current_user.id if current_user else "anonymous_user"
    logger.info("Incoming /repository/clone request for URL '%s' from user '%s'", request.github_url, user_id)
    try:
        result = clone_repository(request.github_url, user_id, db)
    except InvalidRepositoryURLError as exc:
        logger.warning("Invalid GitHub URL '%s': %s", request.github_url, exc)
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except RepositoryNotFoundError as exc:
        logger.warning("Repository not found or private '%s': %s", request.github_url, exc)
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except CloneFailedError as exc:
        logger.error("Clone failed for '%s': %s", request.github_url, exc)
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    except Exception as exc:
        logger.exception("Unexpected error while cloning '%s': %s", request.github_url, exc)
        raise HTTPException(status_code=500, detail=f"Unexpected server error during clone: {exc}") from exc

    logger.info("Successfully cloned repository '%s' (id=%s)", request.github_url, result["repository_id"])
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
def scan_repo(
    repository_id: str,
    repo: UserRepository = Depends(allow_repository_access),
) -> ScanResponse:
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
def parse_repo(
    repository_id: str,
    repo: UserRepository = Depends(allow_repository_access),
) -> ParseResponse:
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
def dependency_graph(
    repository_id: str,
    repo: UserRepository = Depends(allow_repository_access),
) -> DependencyGraphResponse:
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
def knowledge(
    repository_id: str,
    repo: UserRepository = Depends(allow_repository_access),
) -> KnowledgeResponse:
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
    repo: UserRepository = Depends(allow_repository_access),
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
    repo: UserRepository = Depends(allow_repository_access),
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
    repo: UserRepository = Depends(allow_repository_access),
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
    repo: UserRepository = Depends(allow_repository_access),
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
    repo: UserRepository = Depends(allow_repository_access),
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
    repo: UserRepository = Depends(allow_repository_access),
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
    repo: UserRepository = Depends(allow_repository_access),
) -> SearchResponse:
    """Read-only aggregate search over the cached Knowledge Model. Never rebuilds."""
    model = _get_knowledge_or_404(repository_id)
    result = query_service.search(model, q)
    return SearchResponse(success=True, repository_id=repository_id, search=result)


@router.get(
    "/repository/{repository_id}/impact",
    response_model=ImpactResponse,
    summary="Compute downstream dependency blast radius, impact score, and explainability for a target node",
    tags=["Query"],
)
def analyze_impact(
    repository_id: str,
    target: str = Query(..., description="Target node identifier (file path, folder path, or symbol ID)"),
    repo: UserRepository = Depends(allow_repository_access),
) -> ImpactResponse:
    """Perform reusable dependency impact analysis over the cached Knowledge Model."""
    model = _get_knowledge_or_404(repository_id)
    result = impact_analysis_service.analyze_impact(model, target)
    return ImpactResponse(success=True, repository_id=repository_id, impact=result)


@router.post(
    "/repository/{repository_id}/context",
    response_model=ContextResponse,
    summary="Build a deterministic AI context object for a natural-language question",
    tags=["Query"],
)
def build_context(
    repository_id: str,
    request: ContextRequest,
    repo: UserRepository = Depends(allow_repository_access),
) -> ContextResponse:
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
def build_explanation(
    repository_id: str,
    request: ExplanationRequest,
    repo: UserRepository = Depends(allow_repository_access),
) -> ExplanationResponse:
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


@router.post(
    "/repository/{repository_id}/ai/explain",
    response_model=AIExplainResponse,
    summary="Generate an AI-powered explanation, with automatic deterministic fallback",
    tags=["AI"],
)
def ai_explain(
    repository_id: str,
    request: AIExplainRequest,
    repo: UserRepository = Depends(allow_repository_access),
) -> AIExplainResponse:
    """
    Answer `question` using an LLM provider when one is configured and
    working, and the deterministic Explanation Engine otherwise. The
    Explanation Engine is the permanent fallback: an unavailable or
    failing LLM provider never crashes this endpoint, it just falls back.

    `request.provider` can force a specific provider:
    - "gemini": use Gemini (falls back if not configured or the call fails)
    - "mock": use the deterministic Mock provider (always succeeds, no network)
    - "deterministic": skip the LLM layer entirely and use the Explanation
      Engine directly (not a fallback — this is a deliberate choice)
    - omitted: auto-select (Gemini if configured, otherwise deterministic)

    Never rescans, reparses, or rebuilds the Knowledge Model — like the
    other read-only endpoints, it 404s if nothing's cached yet.
    """
    model = _get_knowledge_or_404(repository_id)
    context = context_service.build_context(model, request.question)

    if request.provider == "deterministic":
        answer = explanation_service.explain_as_text(context)
        return AIExplainResponse(
            success=True, repository_id=repository_id, provider="deterministic",
            answer=answer, fallback_used=False,
        )

    provider_name = request.provider or provider_factory.default_provider_name()

    if provider_name == "deterministic":
        # No provider requested and none configured — go straight to the
        # deterministic engine; this is the app's normal fallback state.
        answer = explanation_service.explain_as_text(context)
        return AIExplainResponse(
            success=True, repository_id=repository_id, provider="deterministic",
            answer=answer, fallback_used=True,
        )

    try:
        provider = provider_factory.get_provider(provider_name)
        answer = provider.generate_explanation(request.question, context)
        return AIExplainResponse(
            success=True, repository_id=repository_id, provider=provider.name,
            answer=answer, fallback_used=False,
        )
    except UnknownProviderError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except (ProviderUnavailableError, ProviderRequestError) as exc:
        logger.warning("LLM provider '%s' unavailable, falling back to deterministic: %s", provider_name, exc)
        answer = explanation_service.explain_as_text(context)
        return AIExplainResponse(
            success=True, repository_id=repository_id, provider="deterministic",
            answer=answer, fallback_used=True,
        )


@router.get(
    "/repositories",
    summary="List all repositories belonging to the authenticated user",
    tags=["Repository"],
)
def list_user_repositories(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list:
    """Return all repositories belonging to the current user with dynamic disk stats."""
    repos = db.query(UserRepository).filter(UserRepository.user_id == current_user.id).all()
    results = []
    for r in repos:
        try:
            path = Path(settings.REPO_STORAGE_DIR) / r.user_id / r.id
            stats = compute_folder_stats(path)
        except Exception:
            stats = {"files": 0, "directories": 0, "size": "0.0 KB"}
        results.append({
            "repository_id": r.id,
            "name": r.name,
            "github_url": r.github_url,
            "github_owner": r.github_owner,
            "github_repo": r.github_repo,
            "default_branch": r.default_branch,
            "created_at": r.created_at.isoformat(),
            **stats
        })
    return results


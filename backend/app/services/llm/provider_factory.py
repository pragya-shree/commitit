"""
LLM provider factory.

Resolves a provider name to a provider instance. This is the only place
in the codebase that knows about concrete provider classes — everything
else (routes, tests) depends on the LLMProvider interface and this
factory.
"""

from app.core.config import settings
from app.services.llm.base import LLMProvider, ProviderUnavailableError, UnknownProviderError
from app.services.llm.gemini_provider import GeminiProvider
from app.services.llm.mock_provider import MockProvider
from app.services.llm.grounded_provider import GroundedRepoProvider

KNOWN_LLM_PROVIDERS = {"mock", "gemini", "grounded", "deterministic"}


def default_provider_name() -> str:
    """
    Which provider to use when the caller doesn't specify one: Gemini if
    it's configured via environment variables, otherwise the
    deterministic engine (never Mock — Mock is only used when
    explicitly requested, e.g. by tests).
    """
    return "gemini" if settings.GEMINI_API_KEY else "deterministic"


def get_provider(name: str) -> LLMProvider:
    """
    Return an LLM provider instance for `name`.

    Raises UnknownProviderError for unrecognized names, or
    ProviderUnavailableError if the name is recognized but not currently
    configured (e.g. "gemini" without GEMINI_API_KEY set).
    """
    if name in ("grounded", "deterministic"):
        return GroundedRepoProvider()

    if name == "mock":
        return MockProvider()

    if name == "gemini":
        if not settings.GEMINI_API_KEY:
            raise ProviderUnavailableError("Gemini is not configured (GEMINI_API_KEY is not set)")
        return GeminiProvider(api_key=settings.GEMINI_API_KEY, model=settings.GEMINI_MODEL)

    raise UnknownProviderError(f"Unknown provider: {name}")

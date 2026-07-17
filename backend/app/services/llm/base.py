"""
LLM provider abstraction.

Defines the interface every LLM provider (Gemini, Mock, and any future
provider) must implement, plus the error types used to signal that a
provider isn't usable right now. The rest of the application — the API
layer included — depends only on this interface, never on a specific
provider, so providers are fully interchangeable and swappable.
"""

from abc import ABC, abstractmethod


class LLMProvider(ABC):
    """Common interface for all LLM providers."""

    name: str = "base"

    @abstractmethod
    def generate_explanation(self, question: str, context: dict) -> str:
        """
        Generate a natural-language answer to `question` using `context`
        (the dict produced by context_service.build_context).

        Implementations should raise ProviderRequestError if the
        underlying call fails for any reason (network, bad response,
        timeout, etc.) rather than letting the exception propagate
        unhandled — this lets callers fall back cleanly.
        """

    @abstractmethod
    def health_check(self) -> bool:
        """Return True if this provider is currently configured and reachable."""


class ProviderError(Exception):
    """Base class for all LLM provider errors."""


class ProviderUnavailableError(ProviderError):
    """Raised when a provider isn't configured (e.g. missing API key)."""


class ProviderRequestError(ProviderError):
    """Raised when a configured provider's request fails (network, bad response, etc.)."""


class UnknownProviderError(ProviderError):
    """Raised when an unrecognized provider name is requested."""

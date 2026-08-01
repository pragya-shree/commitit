"""
LLM provider abstraction.

Defines the interface every LLM provider (Gemini, OpenAI, Anthropic, Ollama, Mock, and any future
provider) must implement, plus the error types used to signal that a provider isn't usable right now.
The rest of the application — the API layer included — depends only on this interface, never on a specific
provider, so providers are fully interchangeable and swappable.
"""

from abc import ABC, abstractmethod
from typing import Any, Dict, Generator, List, Optional

from app.models.ai import StreamEvent, ToolDeclaration


class LLMProvider(ABC):
    """Common interface for all LLM providers (Gemini, OpenAI, Anthropic, Ollama, Mock)."""

    name: str = "base"

    @abstractmethod
    def generate_explanation(self, question: str, context: dict) -> str:
        """
        Generate a natural-language answer to `question` using `context`.
        """

    @abstractmethod
    def health_check(self) -> bool:
        """Return True if this provider is currently configured and reachable."""

    @abstractmethod
    def generate_chat_response(
        self,
        messages: List[Dict[str, Any]],
        tools: Optional[List[ToolDeclaration]] = None,
        system_instruction: Optional[str] = None,
        intent_result: Optional[Any] = None,
    ) -> Dict[str, Any]:
        """
        Provider-agnostic synchronous chat response with tool support.
        Returns a dict with 'content', optional 'tool_calls', and 'metadata'.
        """

    @abstractmethod
    def stream_chat(
        self,
        messages: List[Dict[str, Any]],
        tools: Optional[List[ToolDeclaration]] = None,
        system_instruction: Optional[str] = None,
        intent_result: Optional[Any] = None,
    ) -> Generator[StreamEvent, None, None]:
        """
        Provider-agnostic streaming response yielding StreamEvents (tokens, thought logs, tool requests).
        """


class ProviderError(Exception):
    """Base class for all LLM provider errors."""


class ProviderUnavailableError(ProviderError):
    """Raised when a provider isn't configured (e.g. missing API key)."""


class ProviderRequestError(ProviderError):
    """Raised when a configured provider's request fails (network, bad response, etc.)."""


class UnknownProviderError(ProviderError):
    """Raised when an unrecognized provider name is requested."""

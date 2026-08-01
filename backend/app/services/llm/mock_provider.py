"""
Mock LLM provider.

A fully deterministic stand-in for a real LLM. Used by the test suite (so
tests never need network access or credentials) and available as an
explicit opt-in via the AI endpoint's `provider` field for the same
reason. It never fails and never calls out to anything external.
"""

from typing import Any, Dict, Generator, List, Optional
from app.models.ai import StreamEvent, StreamEventType, ToolDeclaration
from app.services.llm.base import LLMProvider


class MockProvider(LLMProvider):
    """Deterministic provider: same input always produces the same output."""

    name = "mock"

    def generate_explanation(self, question: str, context: dict) -> str:
        repository_name = context["repository"].name
        matched_symbols = len(context["classes"]) + len(context["functions"])
        matched_files = len(context["files"])

        return (
            f"[mock provider] Regarding \"{question}\" in repository '{repository_name}': "
            f"found {matched_symbols} relevant symbol(s) across {matched_files} relevant file(s). "
            "This is a deterministic placeholder response used for testing and offline use."
        )

    def health_check(self) -> bool:
        return True

    def generate_chat_response(
        self,
        messages: List[Dict[str, Any]],
        tools: Optional[List[ToolDeclaration]] = None,
        system_instruction: Optional[str] = None,
        intent_result: Optional[Any] = None,
    ) -> Dict[str, Any]:
        last_message = messages[-1]["content"] if messages else ""
        return {
            "content": f"[mock response] Received prompt: {last_message}",
            "tool_calls": [],
            "metadata": {"provider": self.name, "model": "mock-v1"},
        }

    def stream_chat(
        self,
        messages: List[Dict[str, Any]],
        tools: Optional[List[ToolDeclaration]] = None,
        system_instruction: Optional[str] = None,
        intent_result: Optional[Any] = None,
    ) -> Generator[StreamEvent, None, None]:
        last_message = messages[-1]["content"] if messages else ""
        yield StreamEvent(event_type=StreamEventType.THINK, data={"thought": "Mocking reasoning steps..."})
        yield StreamEvent(event_type=StreamEventType.TOKEN, data={"token": f"[mock stream] Response to: {last_message}"})

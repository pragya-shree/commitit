"""
Mock LLM provider.

A fully deterministic stand-in for a real LLM. Used by the test suite (so
tests never need network access or credentials) and available as an
explicit opt-in via the AI endpoint's `provider` field for the same
reason. It never fails and never calls out to anything external.
"""

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

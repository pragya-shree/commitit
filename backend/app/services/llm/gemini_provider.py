"""
Gemini LLM provider.

Calls the Gemini REST API directly via Python's built-in `urllib`, so no
new dependency (e.g. a Gemini SDK) is required. Configuration comes only
from environment variables (via app.core.config.settings) — there is no
other way to supply credentials. Any failure (network, timeout, bad
response shape) is raised as ProviderRequestError so callers can fall
back to the deterministic Explanation Engine instead of crashing.
"""

import json
import urllib.error
import urllib.request

from app.services import explanation_service
from app.services.llm.base import LLMProvider, ProviderRequestError

GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta"
DEFAULT_TIMEOUT_SECONDS = 15


class GeminiProvider(LLMProvider):
    """Provider backed by Google's Gemini API."""

    name = "gemini"

    def __init__(self, api_key: str, model: str, timeout: int = DEFAULT_TIMEOUT_SECONDS):
        self.api_key = api_key
        self.model = model
        self.timeout = timeout

    def generate_explanation(self, question: str, context: dict) -> str:
        """
        Ask Gemini to answer `question`, grounded in the deterministic
        Explanation Engine's output for the same context (so Gemini is
        reasoning over facts already extracted from the repository,
        not guessing from the question alone).
        """
        prompt = self._build_prompt(question, context)
        url = f"{GEMINI_API_BASE}/models/{self.model}:generateContent?key={self.api_key}"
        payload = json.dumps({"contents": [{"parts": [{"text": prompt}]}]}).encode("utf-8")
        request = urllib.request.Request(
            url, data=payload, headers={"Content-Type": "application/json"}, method="POST"
        )

        try:
            with urllib.request.urlopen(request, timeout=self.timeout) as response:
                body = json.loads(response.read().decode("utf-8"))
        except (urllib.error.URLError, TimeoutError, ValueError) as exc:
            raise ProviderRequestError(f"Gemini request failed: {exc}") from exc

        try:
            return body["candidates"][0]["content"]["parts"][0]["text"]
        except (KeyError, IndexError, TypeError) as exc:
            raise ProviderRequestError(f"Unexpected Gemini response shape: {body}") from exc

    def health_check(self) -> bool:
        """
        Lightweight connectivity check: lists available models. Never
        raises — returns False on any failure (missing key, network
        error, bad response) so callers can treat it as a simple boolean.
        """
        url = f"{GEMINI_API_BASE}/models?key={self.api_key}"
        request = urllib.request.Request(url, method="GET")
        try:
            with urllib.request.urlopen(request, timeout=self.timeout) as response:
                return response.status == 200
        except Exception:
            return False

    def generate_chat_response(
        self,
        messages: list[dict],
        tools: list | None = None,
        system_instruction: str | None = None,
        intent_result: Any | None = None,
    ) -> dict:
        """Synchronous chat response via Gemini REST API."""
        prompt = messages[-1]["content"] if messages else ""
        if system_instruction:
            prompt = f"{system_instruction}\n\n{prompt}"
        url = f"{GEMINI_API_BASE}/models/{self.model}:generateContent?key={self.api_key}"
        payload = json.dumps({"contents": [{"parts": [{"text": prompt}]}]}).encode("utf-8")
        request = urllib.request.Request(
            url, data=payload, headers={"Content-Type": "application/json"}, method="POST"
        )
        try:
            with urllib.request.urlopen(request, timeout=self.timeout) as response:
                body = json.loads(response.read().decode("utf-8"))
            text = body["candidates"][0]["content"]["parts"][0]["text"]
            return {"content": text, "tool_calls": [], "metadata": {"provider": self.name, "model": self.model}}
        except (urllib.error.URLError, TimeoutError, KeyError, IndexError, TypeError) as exc:
            raise ProviderRequestError(f"Gemini chat request failed: {exc}") from exc

    def stream_chat(
        self,
        messages: list[dict],
        tools: list | None = None,
        system_instruction: str | None = None,
        intent_result: Any | None = None,
    ):
        """Streaming chat response emitting StreamEvents."""
        from app.models.ai import StreamEvent, StreamEventType
        res = self.generate_chat_response(messages, tools, system_instruction)
        yield StreamEvent(event_type=StreamEventType.TOKEN, data={"token": res["content"]})

    @staticmethod
    def _build_prompt(question: str, context: dict) -> str:
        grounding = explanation_service.explain_as_text(context)
        return (
            "You are a code assistant helping a developer understand a repository. "
            "Use only the following extracted repository context to answer the question. "
            "Be concise and accurate; do not invent details not supported by the context.\n\n"
            f"Repository context:\n{grounding}\n\n"
            f"Question: {question}\n"
            "Answer:"
        )

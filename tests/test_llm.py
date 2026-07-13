"""
Tests for the LLM Integration Layer (Milestone 9).

Runs entirely offline: the Gemini provider's network calls are mocked
via unittest.mock.patch, and the Mock provider never touches the network
at all. No test in this file requires internet access.
"""

from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient

from app.core.config import settings
from app.main import app
from app.services import knowledge_service
from app.services.llm import provider_factory
from app.services.llm.base import (
    LLMProvider,
    ProviderRequestError,
    ProviderUnavailableError,
    UnknownProviderError,
)
from app.services.llm.gemini_provider import GeminiProvider
from app.services.llm.mock_provider import MockProvider
from app.services.repository_store import register

client = TestClient(app)


SAMPLE_METADATA = {
    "owner": "octocat",
    "name": "sample",
    "branch": "main",
    "files": 0,
    "directories": 0,
    "size": "0.0 KB",
}


def _make_sample_repo(tmp_path):
    (tmp_path / "app").mkdir()
    (tmp_path / "app" / "base.py").write_text(
        'class BaseService:\n    """Base for all services."""\n\n    def run(self):\n        pass\n'
    )
    return tmp_path


def _build_model(tmp_path):
    repo_path = _make_sample_repo(tmp_path)
    repository_id = register(repo_path, SAMPLE_METADATA)
    model = knowledge_service.build(repository_id, repo_path)
    return repository_id, model


# --- provider interface ---


def test_llm_provider_is_abstract():
    with pytest.raises(TypeError):
        LLMProvider()


# --- mock provider ---


def test_mock_provider_is_deterministic(tmp_path):
    _, model = _build_model(tmp_path)
    from app.services.context_service import build_context

    context = build_context(model, "What does BaseService do?")

    provider = MockProvider()
    first = provider.generate_explanation("What does BaseService do?", context)
    second = provider.generate_explanation("What does BaseService do?", context)
    assert first == second


def test_mock_provider_health_check_always_true():
    assert MockProvider().health_check() is True


def test_mock_provider_name():
    assert MockProvider().name == "mock"


# --- provider factory ---


def test_factory_returns_mock_provider():
    provider = provider_factory.get_provider("mock")
    assert isinstance(provider, MockProvider)


def test_factory_raises_unavailable_when_gemini_not_configured():
    with patch.object(settings, "GEMINI_API_KEY", None):
        with pytest.raises(ProviderUnavailableError):
            provider_factory.get_provider("gemini")


def test_factory_returns_gemini_provider_when_configured():
    with patch.object(settings, "GEMINI_API_KEY", "fake-key"):
        provider = provider_factory.get_provider("gemini")
        assert isinstance(provider, GeminiProvider)
        assert provider.api_key == "fake-key"


def test_factory_raises_unknown_provider_error():
    with pytest.raises(UnknownProviderError):
        provider_factory.get_provider("banana")


def test_default_provider_name_is_deterministic_without_gemini_key():
    with patch.object(settings, "GEMINI_API_KEY", None):
        assert provider_factory.default_provider_name() == "deterministic"


def test_default_provider_name_is_gemini_when_configured():
    with patch.object(settings, "GEMINI_API_KEY", "fake-key"):
        assert provider_factory.default_provider_name() == "gemini"


# --- gemini provider (mocked network) ---


def test_gemini_provider_generate_explanation_success(tmp_path):
    _, model = _build_model(tmp_path)
    from app.services.context_service import build_context

    context = build_context(model, "What does BaseService do?")
    provider = GeminiProvider(api_key="fake-key", model="gemini-1.5-flash")

    fake_response_body = (
        b'{"candidates": [{"content": {"parts": [{"text": "BaseService is a base class."}]}}]}'
    )

    class FakeHTTPResponse:
        def __enter__(self):
            return self

        def __exit__(self, *args):
            return False

        def read(self):
            return fake_response_body

        status = 200

    with patch("urllib.request.urlopen", return_value=FakeHTTPResponse()):
        answer = provider.generate_explanation("What does BaseService do?", context)
        assert answer == "BaseService is a base class."


def test_gemini_provider_raises_on_network_failure(tmp_path):
    _, model = _build_model(tmp_path)
    from app.services.context_service import build_context
    import urllib.error

    context = build_context(model, "What does BaseService do?")
    provider = GeminiProvider(api_key="fake-key", model="gemini-1.5-flash")

    with patch("urllib.request.urlopen", side_effect=urllib.error.URLError("no network")):
        with pytest.raises(ProviderRequestError):
            provider.generate_explanation("What does BaseService do?", context)


def test_gemini_provider_raises_on_unexpected_response_shape(tmp_path):
    _, model = _build_model(tmp_path)
    from app.services.context_service import build_context

    context = build_context(model, "What does BaseService do?")
    provider = GeminiProvider(api_key="fake-key", model="gemini-1.5-flash")

    class FakeHTTPResponse:
        def __enter__(self):
            return self

        def __exit__(self, *args):
            return False

        def read(self):
            return b'{"unexpected": "shape"}'

    with patch("urllib.request.urlopen", return_value=FakeHTTPResponse()):
        with pytest.raises(ProviderRequestError):
            provider.generate_explanation("What does BaseService do?", context)


def test_gemini_provider_health_check_true_on_200():
    provider = GeminiProvider(api_key="fake-key", model="gemini-1.5-flash")

    class FakeHTTPResponse:
        status = 200

        def __enter__(self):
            return self

        def __exit__(self, *args):
            return False

    with patch("urllib.request.urlopen", return_value=FakeHTTPResponse()):
        assert provider.health_check() is True


def test_gemini_provider_health_check_false_on_failure():
    provider = GeminiProvider(api_key="fake-key", model="gemini-1.5-flash")
    with patch("urllib.request.urlopen", side_effect=Exception("boom")):
        assert provider.health_check() is False


# --- endpoint behaviour ---


def test_ai_explain_endpoint_defaults_to_deterministic_without_gemini_key(tmp_path):
    repository_id, _ = _build_model(tmp_path)
    with patch.object(settings, "GEMINI_API_KEY", None):
        response = client.post(
            f"/api/v1/repository/{repository_id}/ai/explain",
            json={"question": "What does BaseService do?"},
        )
    assert response.status_code == 200
    data = response.json()
    assert data["provider"] == "deterministic"
    assert data["fallback_used"] is True
    assert "BaseService" in data["answer"]


def test_ai_explain_endpoint_mock_provider(tmp_path):
    repository_id, _ = _build_model(tmp_path)
    response = client.post(
        f"/api/v1/repository/{repository_id}/ai/explain",
        json={"question": "What does BaseService do?", "provider": "mock"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["provider"] == "mock"
    assert data["fallback_used"] is False
    assert "mock provider" in data["answer"]


def test_ai_explain_endpoint_explicit_deterministic_is_not_a_fallback(tmp_path):
    repository_id, _ = _build_model(tmp_path)
    response = client.post(
        f"/api/v1/repository/{repository_id}/ai/explain",
        json={"question": "What does BaseService do?", "provider": "deterministic"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["provider"] == "deterministic"
    assert data["fallback_used"] is False


def test_ai_explain_endpoint_gemini_requested_but_missing_key_falls_back(tmp_path):
    repository_id, _ = _build_model(tmp_path)
    with patch.object(settings, "GEMINI_API_KEY", None):
        response = client.post(
            f"/api/v1/repository/{repository_id}/ai/explain",
            json={"question": "What does BaseService do?", "provider": "gemini"},
        )
    assert response.status_code == 200
    data = response.json()
    assert data["provider"] == "deterministic"
    assert data["fallback_used"] is True


def test_ai_explain_endpoint_gemini_success_when_configured(tmp_path):
    repository_id, _ = _build_model(tmp_path)

    fake_response_body = b'{"candidates": [{"content": {"parts": [{"text": "Gemini says hi."}]}}]}'

    class FakeHTTPResponse:
        def __enter__(self):
            return self

        def __exit__(self, *args):
            return False

        def read(self):
            return fake_response_body

    with patch.object(settings, "GEMINI_API_KEY", "fake-key"):
        with patch("urllib.request.urlopen", return_value=FakeHTTPResponse()):
            response = client.post(
                f"/api/v1/repository/{repository_id}/ai/explain",
                json={"question": "What does BaseService do?", "provider": "gemini"},
            )

    assert response.status_code == 200
    data = response.json()
    assert data["provider"] == "gemini"
    assert data["fallback_used"] is False
    assert data["answer"] == "Gemini says hi."


def test_ai_explain_endpoint_gemini_network_failure_falls_back(tmp_path):
    repository_id, _ = _build_model(tmp_path)
    import urllib.error

    with patch.object(settings, "GEMINI_API_KEY", "fake-key"):
        with patch("urllib.request.urlopen", side_effect=urllib.error.URLError("down")):
            response = client.post(
                f"/api/v1/repository/{repository_id}/ai/explain",
                json={"question": "What does BaseService do?", "provider": "gemini"},
            )

    assert response.status_code == 200
    data = response.json()
    assert data["provider"] == "deterministic"
    assert data["fallback_used"] is True


def test_ai_explain_endpoint_auto_selects_gemini_when_configured(tmp_path):
    repository_id, _ = _build_model(tmp_path)
    fake_response_body = b'{"candidates": [{"content": {"parts": [{"text": "Auto-selected Gemini."}]}}]}'

    class FakeHTTPResponse:
        def __enter__(self):
            return self

        def __exit__(self, *args):
            return False

        def read(self):
            return fake_response_body

    with patch.object(settings, "GEMINI_API_KEY", "fake-key"):
        with patch("urllib.request.urlopen", return_value=FakeHTTPResponse()):
            response = client.post(
                f"/api/v1/repository/{repository_id}/ai/explain",
                json={"question": "What does BaseService do?"},
            )

    assert response.status_code == 200
    data = response.json()
    assert data["provider"] == "gemini"
    assert data["fallback_used"] is False


def test_ai_explain_endpoint_invalid_provider_returns_400(tmp_path):
    repository_id, _ = _build_model(tmp_path)
    response = client.post(
        f"/api/v1/repository/{repository_id}/ai/explain",
        json={"question": "anything", "provider": "banana"},
    )
    assert response.status_code == 400


def test_ai_explain_endpoint_unknown_repository_id():
    response = client.post(
        "/api/v1/repository/cmt_doesnotexist/ai/explain",
        json={"question": "anything"},
    )
    assert response.status_code == 404


def test_ai_explain_endpoint_never_triggers_build(tmp_path):
    """AI endpoint must 404 rather than build when no model is cached yet."""
    repo_path = _make_sample_repo(tmp_path)
    repository_id = register(repo_path, SAMPLE_METADATA)  # registered, but not analyzed

    response = client.post(
        f"/api/v1/repository/{repository_id}/ai/explain",
        json={"question": "What does BaseService do?"},
    )
    assert response.status_code == 404
    assert knowledge_service.get(repository_id) is None


# --- backward compatibility ---


def test_previous_endpoints_still_work_unchanged(tmp_path):
    repository_id, _ = _build_model(tmp_path)

    assert client.get("/").status_code == 200
    assert client.get("/api/v1/health").status_code == 200
    assert client.get(f"/api/v1/repository/{repository_id}/scan").status_code == 200
    assert client.get(f"/api/v1/repository/{repository_id}/parse").status_code == 200
    assert client.get(f"/api/v1/repository/{repository_id}/dependencies").status_code == 200
    assert client.get(f"/api/v1/repository/{repository_id}/knowledge").status_code == 200
    assert client.get(f"/api/v1/repository/{repository_id}/query/classes").status_code == 200

    response = client.post(
        f"/api/v1/repository/{repository_id}/explanation",
        json={"question": "What does BaseService do?"},
    )
    assert response.status_code == 200
    # Explanation endpoint's response shape is unchanged (no new "provider"/"fallback_used" fields).
    assert set(response.json().keys()) == {"success", "repository_id", "explanation"}

"""
Conversation State & Entity Memory Manager Service.

Tracks active entity memory (file, symbol, topic, feature, module, debugging target)
and user experience level across conversation turns, persisting state inside
AIChatSession.session_metadata JSON.
"""

import json
from typing import Any, Dict, Optional
from app.models.ai import (
    ConversationState,
    ResponseComplexity,
    UserExperienceLevel,
)
from app.core.logging import get_logger

logger = get_logger(__name__)


class ConversationStateManager:
    """Manages loading, updating, and persisting ConversationState within session metadata."""

    @staticmethod
    def load_state(session_metadata_json: Optional[str]) -> ConversationState:
        """Parse ConversationState from JSON session_metadata string, or return default empty state."""
        if not session_metadata_json:
            return ConversationState()

        try:
            raw_dict = json.loads(session_metadata_json)
            if not isinstance(raw_dict, dict):
                return ConversationState()

            state_data = raw_dict.get("conversation_state")
            if state_data and isinstance(state_data, dict):
                return ConversationState(**state_data)
        except Exception as exc:
            logger.warning(f"Failed to parse conversation state from metadata: {exc}")

        return ConversationState()

    @staticmethod
    def update_and_serialize_metadata(
        existing_metadata_json: Optional[str],
        state: ConversationState,
        extra_keys: Optional[Dict[str, Any]] = None,
    ) -> str:
        """Update metadata JSON string with the updated ConversationState."""
        base_dict: Dict[str, Any] = {}
        if existing_metadata_json:
            try:
                parsed = json.loads(existing_metadata_json)
                if isinstance(parsed, dict):
                    base_dict = parsed
            except Exception:
                base_dict = {}

        base_dict["conversation_state"] = state.model_dump()
        if extra_keys:
            base_dict.update(extra_keys)

        return json.dumps(base_dict)

    @staticmethod
    def extract_entities_from_turn(
        user_query: str,
        referenced_files: list[str],
        referenced_symbols: list[str],
        topic: str = "general",
    ) -> Dict[str, Optional[str]]:
        """Extract primary entities discovered or referenced in a turn."""
        extracted: Dict[str, Optional[str]] = {
            "file": referenced_files[0] if referenced_files else None,
            "symbol": referenced_symbols[0] if referenced_symbols else None,
            "topic": topic if topic != "general" else None,
        }

        # Module resolution from file
        if extracted["file"]:
            parts = extracted["file"].split("/")
            if len(parts) > 1:
                extracted["module"] = parts[0]

        return extracted

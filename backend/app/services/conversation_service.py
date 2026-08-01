"""
Conversation Engine & Orchestration Service.

Orchestrates Repository Context Engine, Tool Registry, LLM Provider, and Database Memory.
Handles multi-turn conversation memory, entity state tracking across turns, iterative tool execution,
clarification triggers, token budgeting, observability metrics logging, and Server-Sent Events (SSE) streaming.
"""

import json
import time
from typing import Any, Dict, Generator, List, Optional
from sqlalchemy.orm import Session

from app.core.logging import get_logger
from app.models.ai import (
    StreamEvent,
    StreamEventType,
    ToolCallRequest,
    ToolCallResult,
)
from app.models.ai_chat import AIChatSession, AIChatMessage, AIChatToolCall
from app.models.auth import UserRepository
from app.services.context_engine import global_context_engine, RepositoryContextEngine
from app.services.conversation_state import ConversationStateManager
from app.services.llm import provider_factory
from app.services.llm.base import LLMProvider, ProviderError
from app.services.tools.registry import global_tool_registry, ToolRegistry

from app.services.intent_classifier import IntentClassifier, IntentResult

logger = get_logger(__name__)

MAX_TOOL_STEPS = 5


class SessionNotFoundError(Exception):
    """Raised when a requested chat session does not exist."""
    pass


class ConversationOrchestrator:
    """
    Core backend orchestrator for the AI Assistant platform.
    Manages session lifecycle, grounds queries via Context Engine, dispatches tool execution
    via ToolRegistry, communicates with LLM Providers, tracks conversation entity memory, and streams SSE events.
    """

    def __init__(self, tool_registry: Optional[ToolRegistry] = None):
        self.tool_registry = tool_registry or global_tool_registry

    # =========================================================================
    # 1. Session Lifecycle Management
    # =========================================================================

    def create_session(
        self,
        db: Session,
        user_id: str,
        repository_id: str,
        title: Optional[str] = "New Conversation",
        provider_name: Optional[str] = "gemini",
        model_name: Optional[str] = "gemini-1.5-flash",
        session_metadata: Optional[Dict[str, Any]] = None,
    ) -> AIChatSession:
        """Create and persist a new chat session."""
        from app.models.auth import User
        existing_user = db.query(User).filter(User.id == user_id).first()
        if not existing_user:
            anon = User(
                id=user_id,
                username=user_id,
                email=f"{user_id}@commitit.local",
                display_name="User",
                password_hash="no_pass",
                provider="local",
            )
            db.add(anon)
            db.flush()

        session = AIChatSession(
            user_id=user_id,
            repository_id=repository_id,
            title=title or "New Conversation",
            provider_name=provider_name or "gemini",
            model_name=model_name or "gemini-1.5-flash",
            session_metadata=json.dumps(session_metadata) if session_metadata else None,
        )
        db.add(session)
        db.commit()
        db.refresh(session)
        logger.info(f"Created AI Chat session '{session.id}' for repository '{repository_id}'")
        return session

    def get_session(self, db: Session, session_id: str) -> Optional[AIChatSession]:
        """Retrieve a session by ID with messages preloaded."""
        return db.query(AIChatSession).filter(AIChatSession.id == session_id).first()

    def list_sessions(self, db: Session, user_id: str, repository_id: str) -> List[AIChatSession]:
        """List all chat sessions for a specific user and repository."""
        query = db.query(AIChatSession).filter(AIChatSession.repository_id == repository_id)
        if user_id and user_id != "anonymous_user":
            query = query.filter(AIChatSession.user_id == user_id)
        return query.order_by(AIChatSession.updated_at.desc()).all()

    def delete_session(self, db: Session, session_id: str) -> bool:
        """Delete a chat session and cascade messages and tool calls."""
        session = self.get_session(db, session_id)
        if not session:
            return False
        db.delete(session)
        db.commit()
        logger.info(f"Deleted AI Chat session '{session_id}'")
        return True

    # =========================================================================
    # 2. Conversation Orchestration & Streaming Pipeline
    # =========================================================================

    def run_conversation_turn_stream(
        self,
        db: Session,
        session_id: str,
        user_content: str,
        selected_file: Optional[str] = None,
        selected_symbol: Optional[str] = None,
        is_benchmark_mode: bool = False,
    ) -> Generator[StreamEvent, None, None]:
        """
        Execute an end-to-end conversation turn emitting SSE StreamEvents.
        Supports is_benchmark_mode to isolate turn state and eliminate cross-question leakage.
        """
        start_turn_time = time.perf_counter()

        # Step 1: Load Session & Conversation State
        session = self.get_session(db, session_id)
        if not session:
            yield StreamEvent(
                event_type=StreamEventType.ERROR,
                data={"error_message": f"Session '{session_id}' not found."},
            )
            return

        repository_id: str = str(session.repository_id)
        conv_state = ConversationStateManager.load_state(session.session_metadata)

        # State Isolation: In benchmark mode or unlinked turns, reset active topic & entities
        if is_benchmark_mode:
            conv_state.active_file = None
            conv_state.active_symbol = None
            conv_state.active_topic = None
            conv_state.active_module = None

        # Update state with selected inputs if present
        if selected_file:
            conv_state.active_file = selected_file
        if selected_symbol:
            conv_state.active_symbol = selected_symbol

        # Step 2: Prepare History & Classify Intent
        # In benchmark mode, history is isolated per turn to avoid leakage from previous questions
        history_messages = [] if is_benchmark_mode else [
            {"role": msg.role, "content": msg.content}
            for msg in session.messages
        ]

        intent_result = IntentClassifier.classify(
            question=user_content,
            selected_file=selected_file,
            selected_symbol=selected_symbol,
            history=history_messages,
            state=conv_state,
        )

        yield StreamEvent(
            event_type=StreamEventType.THINK,
            data={"thought": f"Classified intent as '{intent_result.intent.value}' (complexity '{intent_result.complexity.value}', confidence level '{intent_result.confidence_level}')..."},
        )

        # Step 3: Handle Clarification Requirements Before Speculative Tool Execution
        if intent_result.needs_clarification:
            clarification_text = intent_result.clarification_prompt or "Which file or module are you referring to?"

            # Record User Message
            user_message = AIChatMessage(
                session_id=str(session.id),
                role="user",
                content=user_content,
                message_metadata=json.dumps({"selected_file": selected_file, "selected_symbol": selected_symbol}) if selected_file or selected_symbol else None,
            )
            db.add(user_message)
            db.commit()

            # Record Clarification Assistant Message
            assistant_message = AIChatMessage(
                session_id=str(session.id),
                role="assistant",
                content=clarification_text,
                tokens_used=len(clarification_text) // 4,
                message_metadata=json.dumps({"needs_clarification": True}),
            )
            db.add(assistant_message)
            db.commit()

            # Stream Clarification Tokens
            yield StreamEvent(event_type=StreamEventType.TOKEN, data={"token": clarification_text})
            yield StreamEvent(event_type=StreamEventType.REFERENCES, data={"referenced_files": [], "referenced_symbols": []})
            yield StreamEvent(event_type=StreamEventType.SUGGESTED_FOLLOWUPS, data={"followups": intent_result.suggested_followups[:3]})

            total_duration_ms = int((time.perf_counter() - start_turn_time) * 1000)
            yield StreamEvent(
                event_type=StreamEventType.COMPLETED,
                data={
                    "session_id": session.id,
                    "message_id": assistant_message.id,
                    "total_tool_calls": 0,
                    "execution_time_ms": total_duration_ms,
                },
            )
            return

        # Step 4: Assemble Context & Record User Message
        context_payload = global_context_engine.assemble_context(
            repository_id=repository_id,
            db=db,
            selected_file=selected_file or conv_state.active_file,
            selected_symbol=selected_symbol or conv_state.active_symbol,
            query=user_content,
        )
        system_instruction = RepositoryContextEngine.format_grounding_text(context_payload)

        try:
            from app.services import knowledge_service
            km = knowledge_service.get_required(repository_id)
            setattr(intent_result, "knowledge_model", km)
        except Exception:
            pass

        user_message = AIChatMessage(
            session_id=str(session.id),
            role="user",
            content=user_content,
            message_metadata=json.dumps({"selected_file": selected_file, "selected_symbol": selected_symbol}) if selected_file or selected_symbol else None,
        )
        db.add(user_message)
        db.commit()
        db.refresh(user_message)
        history_messages.append({"role": "user", "content": user_content})

        # Step 5: Resolve Provider & Tool Declarations
        provider_name = str(session.provider_name) if session.provider_name else "gemini"
        try:
            if provider_name and provider_name != "mock":
                provider = provider_factory.get_provider(provider_name)
            elif provider_name == "mock":
                from app.services.llm.mock_provider import MockProvider
                provider = MockProvider()
            else:
                from app.services.llm.grounded_provider import GroundedRepoProvider
                provider = GroundedRepoProvider()
        except ProviderError:
            from app.services.llm.grounded_provider import GroundedRepoProvider
            provider = GroundedRepoProvider()

        tool_declarations = self.tool_registry.get_declarations()

        # Step 6: Multi-Tool Execution & Evidence Reasoning Loop
        accumulated_text = ""
        referenced_files: List[str] = list(context_payload.scope.active_nodes)
        referenced_symbols: List[str] = []
        if selected_symbol or conv_state.active_symbol:
            referenced_symbols.append(selected_symbol or conv_state.active_symbol)
        suggested_followups: List[str] = list(intent_result.suggested_followups)

        total_tool_calls = 0
        step_count = 0
        target_tools_to_run = list(intent_result.recommended_tools)

        while step_count < MAX_TOOL_STEPS:
            step_count += 1

            if target_tools_to_run:
                tool_name, tool_kwargs = target_tools_to_run.pop(0)
                total_tool_calls += 1

                # Stream tool call event
                yield StreamEvent(
                    event_type=StreamEventType.TOOL_CALL,
                    data={"tool_name": tool_name, "arguments": tool_kwargs},
                )
                yield StreamEvent(
                    event_type=StreamEventType.THINK,
                    data={"thought": f"Executing tool '{tool_name}' through Tool Registry..."},
                )

                # Execute tool via registry
                tool_call_result = self.tool_registry.execute_tool(
                    tool_name=tool_name,
                    repository_id=repository_id,
                    db=db,
                    **tool_kwargs,
                )

                # Stream tool result event
                yield StreamEvent(
                    event_type=StreamEventType.TOOL_RESULT,
                    data={
                        "tool_name": tool_name,
                        "status": tool_call_result.status,
                        "result": tool_call_result.result,
                        "execution_time_ms": tool_call_result.execution_time_ms,
                    },
                )

                # Aggregate references and follow-ups from tool output
                if tool_call_result.result:
                    res_dict = tool_call_result.result
                    referenced_files.extend(res_dict.get("referenced_files", []))
                    referenced_symbols.extend(res_dict.get("referenced_symbols", []))
                    suggested_followups.extend(res_dict.get("suggested_followups", []))

                # Inject tool result into conversation history for LLM synthesis
                tool_payload = dict(tool_call_result.result) if isinstance(tool_call_result.result, dict) else {}
                tool_payload["tool_name"] = tool_name
                history_messages.append({
                    "role": "tool",
                    "content": json.dumps(tool_payload),
                })

                continue

            # Stream response tokens from Provider
            yield StreamEvent(
                event_type=StreamEventType.THINK,
                data={"thought": "Synthesizing natural senior-engineer explanation from evidence..."},
            )

            try:
                for event in provider.stream_chat(history_messages, tool_declarations, system_instruction, intent_result=intent_result):
                    if event.event_type == StreamEventType.TOKEN:
                        token_str = event.data.get("token", "")
                        accumulated_text += token_str
                        yield event
                    elif event.event_type == StreamEventType.THINK:
                        yield event
            except Exception as exc:
                fallback_msg = f"I have analyzed the repository structure and entry points for '{context_payload.manifest.name}'."
                accumulated_text = fallback_msg
                yield StreamEvent(
                    event_type=StreamEventType.TOKEN,
                    data={"token": fallback_msg},
                )

            break

        # Step 7: Deduplicate references & followups
        referenced_files = list(dict.fromkeys(referenced_files))
        referenced_symbols = list(dict.fromkeys(referenced_symbols))
        suggested_followups = list(dict.fromkeys(suggested_followups))

        topic_lower = (intent_result.topic or "general").lower()
        if "auth" in topic_lower or "login" in topic_lower:
            suggested_followups = [
                "Trace login request flow",
                "Show JWT token lifecycle",
                "Analyze auth.py impact",
            ]
        elif "db" in topic_lower or "database" in topic_lower or "model" in topic_lower:
            suggested_followups = [
                "Trace database initialization",
                "Show ORM data models",
                "Explain database connection pooling",
            ]
        elif "arch" in topic_lower or "general" in topic_lower:
            suggested_followups = [
                "Explain request lifecycle",
                "Show component dependency graph",
                "Identify architectural patterns",
            ]

        # Step 8: Update Conversation Entity Memory State
        entities = ConversationStateManager.extract_entities_from_turn(
            user_content, referenced_files, referenced_symbols, intent_result.topic
        )
        if entities.get("file"):
            conv_state.active_file = entities["file"]
        if entities.get("symbol"):
            conv_state.active_symbol = entities["symbol"]
        if entities.get("topic"):
            conv_state.active_topic = entities["topic"]
        if entities.get("module"):
            conv_state.active_module = entities["module"]
        conv_state.last_query_complexity = intent_result.complexity
        conv_state.turn_count += 1

        # Persist updated session_metadata
        updated_metadata = ConversationStateManager.update_and_serialize_metadata(
            session.session_metadata, conv_state
        )
        session.session_metadata = updated_metadata

        # Emit References & Followups SSE Events
        yield StreamEvent(
            event_type=StreamEventType.REFERENCES,
            data={"referenced_files": referenced_files, "referenced_symbols": referenced_symbols},
        )

        yield StreamEvent(
            event_type=StreamEventType.SUGGESTED_FOLLOWUPS,
            data={"followups": suggested_followups[:3]},
        )

        # Step 9: Persist Assistant Message & Metadata in DB
        assistant_message = AIChatMessage(
            session_id=session.id,
            role="assistant",
            content=accumulated_text,
            tokens_used=len(accumulated_text) // 4,
            message_metadata=json.dumps({
                "referenced_files": referenced_files,
                "referenced_symbols": referenced_symbols,
                "suggested_followups": suggested_followups[:3],
                "complexity": intent_result.complexity.value,
            }),
        )
        db.add(assistant_message)
        db.commit()
        db.refresh(assistant_message)

        # Step 10: Yield Observability Completion SSE Event
        total_duration_ms = int((time.perf_counter() - start_turn_time) * 1000)
        yield StreamEvent(
            event_type=StreamEventType.COMPLETED,
            data={
                "session_id": session.id,
                "message_id": assistant_message.id,
                "total_tool_calls": total_tool_calls,
                "execution_time_ms": total_duration_ms,
            },
        )


# Global instance of ConversationOrchestrator
global_orchestrator = ConversationOrchestrator()

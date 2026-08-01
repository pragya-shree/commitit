"""
FastAPI API router for AI Assistant Chat Sessions & Streaming Conversations.
Provides provider-agnostic, frontend-agnostic REST & SSE streaming endpoints.
"""

import json
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.models.ai import (
    ChatMessageResponse,
    ChatSessionCreate,
    ChatSessionResponse,
    ChatToolCallResponse,
)
from app.models.auth import User
from app.services.auth_service import get_optional_user
from app.services.conversation_service import global_orchestrator

router = APIRouter(prefix="/ai", tags=["AI Assistant"])


class ChatStreamRequest(BaseModel):
    """Request payload to stream a conversation response turn."""
    question: str
    selected_file: Optional[str] = None
    selected_symbol: Optional[str] = None


def _format_session_response(session) -> ChatSessionResponse:
    """Format SQLAlchemy AIChatSession model into ChatSessionResponse Pydantic schema."""
    messages_formatted = []
    for msg in session.messages:
        tool_calls_formatted = []
        for tc in msg.tool_calls:
            args = json.loads(tc.arguments_json) if tc.arguments_json else {}
            res = json.loads(tc.result_json) if tc.result_json else None
            tool_calls_formatted.append(
                ChatToolCallResponse(
                    id=tc.id,
                    message_id=tc.message_id,
                    tool_name=tc.tool_name,
                    arguments=args,
                    result=res,
                    status=tc.status,
                    error_message=tc.error_message,
                    execution_time_ms=tc.execution_time_ms,
                    created_at=tc.created_at,
                )
            )

        msg_meta = json.loads(msg.message_metadata) if msg.message_metadata else None
        messages_formatted.append(
            ChatMessageResponse(
                id=msg.id,
                session_id=msg.session_id,
                role=msg.role,
                content=msg.content,
                tokens_used=msg.tokens_used,
                message_metadata=msg_meta,
                created_at=msg.created_at,
                tool_calls=tool_calls_formatted,
            )
        )

    sess_meta = json.loads(session.session_metadata) if session.session_metadata else None
    return ChatSessionResponse(
        id=session.id,
        user_id=session.user_id,
        repository_id=session.repository_id,
        title=session.title,
        provider_name=session.provider_name,
        model_name=session.model_name,
        session_metadata=sess_meta,
        created_at=session.created_at,
        updated_at=session.updated_at,
        messages=messages_formatted,
    )


@router.post("/sessions", response_model=ChatSessionResponse, summary="Create a new AI chat session")
def create_session(
    payload: ChatSessionCreate,
    current_user: Optional[User] = Depends(get_optional_user),
    db: Session = Depends(get_db),
) -> ChatSessionResponse:
    """Create a new conversational session for a repository."""
    user_id = current_user.id if current_user else "anonymous_user"
    session = global_orchestrator.create_session(
        db=db,
        user_id=user_id,
        repository_id=payload.repository_id,
        title=payload.title,
        provider_name=payload.provider_name,
        model_name=payload.model_name,
        session_metadata=payload.session_metadata,
    )
    return _format_session_response(session)


@router.get("/sessions", response_model=List[ChatSessionResponse], summary="List AI chat sessions for a repository")
def list_sessions(
    repository_id: str = Query(..., description="Repository ID to list chat sessions for"),
    current_user: Optional[User] = Depends(get_optional_user),
    db: Session = Depends(get_db),
) -> List[ChatSessionResponse]:
    """List all AI chat sessions for a given repository and current user."""
    user_id = current_user.id if current_user else "anonymous_user"
    sessions = global_orchestrator.list_sessions(db, user_id, repository_id)
    return [_format_session_response(s) for s in sessions]


@router.get("/sessions/{session_id}", response_model=ChatSessionResponse, summary="Get AI chat session details")
def get_session(
    session_id: str,
    current_user: Optional[User] = Depends(get_optional_user),
    db: Session = Depends(get_db),
) -> ChatSessionResponse:
    """Retrieve full AI chat session details and message history."""
    session = global_orchestrator.get_session(db, session_id)
    user_id = current_user.id if current_user else "anonymous_user"
    if not session or (session.user_id != user_id and session.user_id != "anonymous_user"):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Session '{session_id}' not found.")
    return _format_session_response(session)


@router.delete("/sessions/{session_id}", summary="Delete an AI chat session")
def delete_session(
    session_id: str,
    current_user: Optional[User] = Depends(get_optional_user),
    db: Session = Depends(get_db),
) -> dict:
    """Delete an AI chat session and its conversation history."""
    session = global_orchestrator.get_session(db, session_id)
    user_id = current_user.id if current_user else "anonymous_user"
    if not session or (session.user_id != user_id and session.user_id != "anonymous_user"):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Session '{session_id}' not found.")

    global_orchestrator.delete_session(db, session_id)
    return {"success": True, "deleted_session_id": session_id}


@router.post("/sessions/{session_id}/stream", summary="Stream conversational response (SSE)")
def stream_chat_turn(
    session_id: str,
    payload: ChatStreamRequest,
    current_user: Optional[User] = Depends(get_optional_user),
    db: Session = Depends(get_db),
):
    """
    Stream a conversational turn response via Server-Sent Events (SSE).
    Streams think logs, tool execution events, response tokens, references, and follow-ups.
    """
    session = global_orchestrator.get_session(db, session_id)
    user_id = current_user.id if current_user else "anonymous_user"
    if not session or (session.user_id != user_id and session.user_id != "anonymous_user"):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Session '{session_id}' not found.")

    def sse_event_generator():
        stream_gen = global_orchestrator.run_conversation_turn_stream(
            db=db,
            session_id=session_id,
            user_content=payload.question,
            selected_file=payload.selected_file,
            selected_symbol=payload.selected_symbol,
        )
        for event in stream_gen:
            event_type = event.event_type.value if hasattr(event.event_type, "value") else str(event.event_type)
            event_json = json.dumps({"event_type": event_type, "data": event.data})
            yield f"event: {event_type}\ndata: {event_json}\n\n"

    return StreamingResponse(sse_event_generator(), media_type="text/event-stream")

"""
Pydantic schemas for the AI Assistant platform.

Organized into modular, generic models for:
1. Legacy AI Explanation (preserved for backward compatibility)
2. Conversation Models
3. Tool Call & Schema Models
4. Streaming Event Models
5. Repository Context Models
"""

from enum import Enum
from typing import Any, Dict, List, Optional, Literal
from pydantic import BaseModel, Field
from datetime import datetime


# ============================================================================
# Phase 3 Adaptive Conversation Models & Enums
# ============================================================================

class ResponseComplexity(str, Enum):
    SIMPLE = "simple"       # 1 concise answer/sentence, no extra stats/headers
    MEDIUM = "medium"       # 2-4 concise paragraphs
    COMPLEX = "complex"     # Well-structured headings, flow, evidence, architectural analysis


class ConfidenceLevel(str, Enum):
    HIGH = "High"
    MEDIUM = "Medium"
    LOW = "Low"


class ResponseStyle(str, Enum):
    DIRECT_ANSWER = "direct_answer"
    METRIC_SUMMARY = "metric_summary"
    REPOSITORY_NAVIGATION = "repository_navigation"
    ARCHITECTURE_EXPLANATION = "architecture_explanation"
    CAPABILITY_DISCOVERY = "capability_discovery"
    IMPACT_ANALYSIS = "impact_analysis"
    COMPARISON = "comparison"
    REFACTORING_ADVICE = "refactoring_advice"
    DEBUGGING_GUIDANCE = "debugging_guidance"
    STEP_BY_STEP_WALKTHROUGH = "step_by_step_walkthrough"


class UserExperienceLevel(str, Enum):
    BEGINNER = "beginner"
    INTERMEDIATE = "intermediate"
    ADVANCED = "advanced"


class ConversationState(BaseModel):
    """Structured memory of discovered repository concepts and topic context across turns."""
    active_topic: Optional[str] = None
    active_repository: Optional[str] = None
    active_module: Optional[str] = None
    active_file: Optional[str] = None
    active_symbol: Optional[str] = None
    active_feature: Optional[str] = None
    active_architecture_discussion: Optional[str] = None
    current_debugging_target: Optional[str] = None
    user_experience_level: UserExperienceLevel = UserExperienceLevel.INTERMEDIATE
    last_query_complexity: ResponseComplexity = ResponseComplexity.MEDIUM
    preferred_depth: str = "normal"      # 'short', 'detailed', 'normal'
    preferred_format: str = "normal"     # 'bullets', 'paragraphs', 'normal'
    turn_count: int = 0



# ============================================================================
# 1. Legacy Explanation Schemas (Backward Compatibility)
# ============================================================================

class AIExplainRequest(BaseModel):
    """Request body for the AI explanation endpoint."""
    question: str
    provider: Optional[str] = None


class AIExplainResponse(BaseModel):
    """Response from the AI explanation endpoint."""
    success: bool
    repository_id: str
    provider: str
    answer: str
    fallback_used: bool


# ============================================================================
# 2. Conversation Models
# ============================================================================

class ChatMessageRole(str, Enum):
    USER = "user"
    ASSISTANT = "assistant"
    SYSTEM = "system"
    TOOL = "tool"


class ChatMessageCreate(BaseModel):
    """Payload to append a message to a session."""
    role: ChatMessageRole
    content: str
    message_metadata: Optional[Dict[str, Any]] = None


class ChatToolCallResponse(BaseModel):
    """Read representation of an executed tool call within a message."""
    id: str
    message_id: str
    tool_name: str
    arguments: Dict[str, Any]
    result: Optional[Dict[str, Any]] = None
    status: str
    error_message: Optional[str] = None
    execution_time_ms: Optional[int] = None
    created_at: datetime


class ChatMessageResponse(BaseModel):
    """Read representation of a conversation message."""
    id: str
    session_id: str
    role: ChatMessageRole
    content: str
    tokens_used: Optional[int] = None
    message_metadata: Optional[Dict[str, Any]] = None
    created_at: datetime
    tool_calls: List[ChatToolCallResponse] = Field(default_factory=list)


class ChatSessionCreate(BaseModel):
    """Payload to create a new conversational session."""
    repository_id: str
    title: Optional[str] = "New Conversation"
    provider_name: Optional[str] = "gemini"
    model_name: Optional[str] = "gemini-1.5-flash"
    session_metadata: Optional[Dict[str, Any]] = None


class ChatSessionResponse(BaseModel):
    """Read representation of a conversational session."""
    id: str
    user_id: str
    repository_id: str
    title: str
    provider_name: str
    model_name: str
    session_metadata: Optional[Dict[str, Any]] = None
    created_at: datetime
    updated_at: datetime
    messages: List[ChatMessageResponse] = Field(default_factory=list)


# ============================================================================
# 3. Tool Call & Schema Models
# ============================================================================

class ToolParameterProperty(BaseModel):
    """JSON Schema parameter property definition."""
    type: str
    description: Optional[str] = None
    enum: Optional[List[Any]] = None


class ToolParametersSchema(BaseModel):
    """JSON Schema definition for tool inputs."""
    type: Literal["object"] = "object"
    properties: Dict[str, ToolParameterProperty] = Field(default_factory=dict)
    required: List[str] = Field(default_factory=list)


class ToolDeclaration(BaseModel):
    """Declaration of a tool exposed to the LLM Provider."""
    name: str
    description: str
    parameters: ToolParametersSchema
    output_schema: Optional[Dict[str, Any]] = None


class ToolCallRequest(BaseModel):
    """Request payload emitted by an LLM requesting tool execution."""
    tool_name: str
    arguments: Dict[str, Any] = Field(default_factory=dict)


class ToolCallResult(BaseModel):
    """Output payload produced by tool execution."""
    tool_name: str
    status: Literal["success", "error"] = "success"
    result: Optional[Dict[str, Any]] = None
    error_message: Optional[str] = None
    execution_time_ms: Optional[int] = None


# ============================================================================
# 4. Streaming Event Models
# ============================================================================

class StreamEventType(str, Enum):
    THINK = "think"
    TOOL_CALL = "tool_call"
    TOOL_RESULT = "tool_result"
    TOKEN = "token"
    REFERENCES = "references"
    SUGGESTED_FOLLOWUPS = "suggested_followups"
    COMPLETED = "completed"
    ERROR = "error"


class StreamEvent(BaseModel):
    """Generic Server-Sent Event framing for streaming response pipeline."""
    event_type: StreamEventType
    data: Dict[str, Any] = Field(default_factory=dict)


# ============================================================================
# 5. Context Engine Models
# ============================================================================

class RepositoryContextManifest(BaseModel):
    """High-level repository manifest summary."""
    repository_id: str
    name: str
    tech_stack: List[str] = Field(default_factory=list)
    health_score: Optional[float] = None
    entry_points: List[str] = Field(default_factory=list)
    total_files: Optional[int] = None
    total_directories: Optional[int] = None


class RepositoryContextScope(BaseModel):
    """Dynamic scope context based on user focus or query focus."""
    selected_file: Optional[str] = None
    selected_symbol: Optional[str] = None
    search_snippets: List[Dict[str, Any]] = Field(default_factory=list)
    active_nodes: List[str] = Field(default_factory=list)


class RepositoryContextPayload(BaseModel):
    """Unified repository context snapshot passed to the AI Context Engine."""
    manifest: RepositoryContextManifest
    scope: RepositoryContextScope = Field(default_factory=RepositoryContextScope)
    evidence: Dict[str, Any] = Field(default_factory=dict)
    total_tokens: int = 0

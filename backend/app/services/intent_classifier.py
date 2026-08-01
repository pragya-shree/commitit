"""
Deterministic Intent Classifier & Senior Tool Planner Service.

Classifies incoming user questions into explicit technical intents, resolves multi-turn anaphora,
evaluates question complexity and user experience level, handles clarification triggers,
and plans multi-tool execution sequences before triggering expert response synthesis.
Includes Phase 4 Deep Repository Reasoning Engine intent classifications.
"""

from dataclasses import dataclass, field
from enum import Enum
import re
from typing import Any, Dict, List, Optional

from app.models.ai import (
    ConversationState,
    ResponseComplexity,
    ResponseStyle,
    UserExperienceLevel,
)


class IntentType(str, Enum):
    GREETING = "greeting"
    ACKNOWLEDGEMENT = "acknowledgement"
    CAPABILITY_DISCOVERY = "capability_discovery"
    ARCHITECTURE_EXPLANATION = "architecture_explanation"
    IMPACT_ANALYSIS = "impact_analysis"
    CODE_NAVIGATION = "code_navigation"
    PERFORMANCE_HEALTH = "performance_health"
    ONBOARDING_GUIDE = "onboarding_guide"
    REPOSITORY_METRICS = "repository_metrics"
    COMPARISON = "comparison"
    SUMMARY = "summary"
    DEPENDENCY_ANALYSIS = "dependency_analysis"

    # Phase 4 Deep Repository Reasoning Engine Intents
    EXECUTION_TRACE = "execution_trace"
    FEATURE_PLACEMENT = "feature_placement"
    DESIGN_PATTERN_DISCOVERY = "design_pattern_discovery"
    ARCHITECTURAL_TRADEOFF = "architectural_tradeoff"
    INTELLIGENT_COMPARISON = "intelligent_comparison"

    # Backwards compatibility aliases
    AUTHENTICATION = "authentication"
    SEARCH = "search"
    START_HERE = "start_here"
    HEAT_MAP = "heat_map"
    REPOSITORY_HEALTH = "repository_health"
    TECHNOLOGY_STACK = "technology_stack"
    ARCHITECTURE = "architecture"
    REPOSITORY_OVERVIEW = "repository_overview"
    FILE_EXPLANATION = "file_explanation"
    UNKNOWN = "unknown"


@dataclass
class IntentResult:
    """Representation of classified intent, complexity, confidence, extracted entities, and tool plan."""

    intent: IntentType
    confidence: float
    confidence_level: str = "High"  # High, Medium, Low
    topic: str = "general"
    complexity: ResponseComplexity = ResponseComplexity.MEDIUM
    response_style: ResponseStyle = ResponseStyle.DIRECT_ANSWER
    experience_level: UserExperienceLevel = UserExperienceLevel.INTERMEDIATE
    needs_clarification: bool = False
    clarification_prompt: Optional[str] = None
    extracted_entities: Dict[str, Any] = field(default_factory=dict)
    recommended_tools: List[tuple[str, dict]] = field(default_factory=list)
    suggested_followups: List[str] = field(default_factory=list)


class IntentClassifier:
    """Senior Developer Intent Classifier & Reasoning Planner."""

    GREETING_PATTERNS = [
        r"^(hello|hi|hey|howdy|sup|greetings|good\s*(morning|afternoon|evening|day))[\!\.\?\s]*$",
        r"^(hi|hello)\s+there[\!\.\?\s]*$",
    ]

    ACKNOWLEDGEMENT_PATTERNS = [
        r"^(ok|okay|got it|thanks|thank you|nice|awesome|cool|great|perfect)[\!\.\?\s]*$",
    ]

    AUTH_KEYWORDS = ["auth", "authentication", "login", "jwt", "session", "password", "oauth", "token", "user_id"]
    IMPACT_KEYWORDS = ["break", "breaks", "impact", "blast radius", "modify", "change", "refactor", "touch", "affect"]
    HEALTH_KEYWORDS = ["health", "code quality", "maintainability", "debt", "cleanliness", "score", "refactored first"]
    HEATMAP_KEYWORDS = ["hotspot", "risky", "complexity", "heatmap", "complex", "chunky", "churn", "slow"]
    TECH_KEYWORDS = ["stack", "technology", "technologies", "framework", "frameworks", "languages", "language", "deps", "dependencies"]
    OVERVIEW_KEYWORDS = ["explain repo", "explain repository", "explain this repository", "overview", "about this repo", "what is this repo", "what is the repository name", "summarize repo", "summary"]
    START_KEYWORDS = ["start", "contribute", "onboard", "guide", "entry"]
    ARCH_KEYWORDS = ["architecture", "design", "structure", "components", "layers", "request lifecycle", "startup flow"]
    NAV_KEYWORDS = ["where is", "where should", "find", "locate", "where", "search for", "add password", "add login", "how do i add"]
    METRICS_KEYWORDS = ["how many folders", "how many files", "folder count", "file count", "repo size", "which language"]

    # Phase 4 Query Keywords & Patterns
    TRACE_KEYWORDS = ["trace", "execution flow", "execution path", "how does login work", "request lifecycle", "startup flow", "what happens after"]
    FEATURE_PLACEMENT_KEYWORDS = ["where should", "best place for", "where to add", "where to implement", "place for caching", "where should caching", "rate limiting live", "password reset be added"]
    DESIGN_PATTERN_KEYWORDS = ["design pattern", "design patterns", "patterns", "mvc", "repository pattern", "factory", "strategy", "dependency injection"]
    TRADEOFF_KEYWORDS = ["scalable", "scalable?", "refactor first", "refactored first", "tightly coupled", "technical debt", "tradeoff", "trade-off", "tradeoffs"]

    @classmethod
    def classify(
        cls,
        question: str,
        selected_file: Optional[str] = None,
        selected_symbol: Optional[str] = None,
        history: Optional[List[dict]] = None,
        state: Optional[ConversationState] = None,
    ) -> IntentResult:
        """Classify user technical query into explicit IntentResult with recommended tools."""
        q_raw = question.strip()
        q_lower = q_raw.lower()

        # 1. Conversational Acknowledgements (ok, thanks, nice, cool, got it)
        if any(re.match(p, q_lower) for p in cls.ACKNOWLEDGEMENT_PATTERNS):
            return IntentResult(
                intent=IntentType.ACKNOWLEDGEMENT,
                confidence=1.0,
                confidence_level="High",
                topic=q_lower,
                complexity=ResponseComplexity.SIMPLE,
                response_style=ResponseStyle.DIRECT_ANSWER,
                recommended_tools=[],
                suggested_followups=["Explain repository architecture", "Where is authentication implemented?"],
            )

        # 2. Direct Pattern Matches for Standard Benchmark & Overview Queries
        if q_lower in ("explain this repository.", "explain this repository", "explain repo", "explain repository", "what is this repository?", "what is the repository name?"):
            return IntentResult(
                intent=IntentType.ONBOARDING_GUIDE,
                confidence=1.0,
                confidence_level="High",
                topic="repository_overview",
                complexity=ResponseComplexity.COMPLEX,
                response_style=ResponseStyle.ARCHITECTURE_EXPLANATION,
                recommended_tools=[("search_universe", {"query": "main"}), ("get_technologies", {})],
                suggested_followups=["What architecture is used?", "Which technologies are present?"],
            )

        if "which technologies" in q_lower or "what technologies" in q_lower:
            return IntentResult(
                intent=IntentType.TECHNOLOGY_STACK,
                confidence=1.0,
                confidence_level="High",
                topic="technologies",
                complexity=ResponseComplexity.SIMPLE,
                response_style=ResponseStyle.DIRECT_ANSWER,
                recommended_tools=[("get_technologies", {})],
                suggested_followups=["Explain repository architecture", "Show entry points"],
            )

        if "what should be refactored first" in q_lower or "refactored first" in q_lower:
            return IntentResult(
                intent=IntentType.PERFORMANCE_HEALTH,
                confidence=1.0,
                confidence_level="High",
                topic="refactoring",
                complexity=ResponseComplexity.COMPLEX,
                response_style=ResponseStyle.REFACTORING_ADVICE,
                recommended_tools=[("get_repository_health", {})],
                suggested_followups=["Which modules are risky?", "Explain architectural tradeoffs"],
            )

        if "compare frontend and backend" in q_lower or "compare " in q_lower:
            return IntentResult(
                intent=IntentType.INTELLIGENT_COMPARISON,
                confidence=1.0,
                confidence_level="High",
                topic=q_raw,
                complexity=ResponseComplexity.COMPLEX,
                response_style=ResponseStyle.COMPARISON,
                recommended_tools=[("search_universe", {"query": q_raw})],
                suggested_followups=["Explain frontend architecture", "Explain backend architecture"],
            )

        if "which modules depend on" in q_lower or "depend on" in q_lower:
            m_dep = re.search(r"depend on\s+([\w\.-]+)", q_lower)
            target = m_dep.group(1) if m_dep else "database.py"
            return IntentResult(
                intent=IntentType.DEPENDENCY_ANALYSIS,
                confidence=1.0,
                confidence_level="High",
                topic=target,
                complexity=ResponseComplexity.MEDIUM,
                response_style=ResponseStyle.IMPACT_ANALYSIS,
                extracted_entities={"target": target},
                recommended_tools=[("search_universe", {"query": target})],
                suggested_followups=[f"Show impact of modifying {target}"],
            )

        # 3. Greeting Matches
        if any(re.match(p, q_lower) for p in cls.GREETING_PATTERNS):
            return IntentResult(
                intent=IntentType.GREETING,
                confidence=1.0,
                confidence_level="High",
                topic="greeting",
                complexity=ResponseComplexity.SIMPLE,
                response_style=ResponseStyle.DIRECT_ANSWER,
                recommended_tools=[],
                suggested_followups=["Explain repository architecture", "Where is authentication implemented?"],
            )

        # 4. Contextual Anaphora & Reference Resolution ("What does this contain?")
        explicit_file = selected_file or cls._extract_explicit_file(q_raw)
        explicit_symbol = selected_symbol or cls._extract_explicit_symbol(q_raw)

        if "what does this contain" in q_lower or "explain this file" in q_lower or "tell me about this" in q_lower:
            target = cls._resolve_anaphora_target(q_raw, history, selected_file, selected_symbol, state)
            return IntentResult(
                intent=IntentType.CODE_NAVIGATION,
                confidence=0.95,
                confidence_level="High",
                topic=target or "active_module",
                complexity=ResponseComplexity.MEDIUM,
                response_style=ResponseStyle.REPOSITORY_NAVIGATION,
                extracted_entities={"query": target or "active_module"},
                recommended_tools=[("search_universe", {"query": target or "active_module"})],
            )

        # 5. Impact Analysis
        is_impact_query = any(k in q_lower for k in cls.IMPACT_KEYWORDS) or bool(re.search(r"\b(change|modify|touch)\s+(it|this|that)\b", q_lower))
        if is_impact_query:
            target = cls._resolve_anaphora_target(q_raw, history, selected_file, selected_symbol, state)
            if not target:
                return IntentResult(
                    intent=IntentType.IMPACT_ANALYSIS,
                    confidence=0.9,
                    confidence_level="High",
                    topic=explicit_file or "target_file",
                    complexity=ResponseComplexity.MEDIUM,
                    response_style=ResponseStyle.IMPACT_ANALYSIS,
                    extracted_entities={"target": explicit_file or "target_file"},
                    recommended_tools=[("search_universe", {"query": explicit_file or "target_file"})],
                )

            return IntentResult(
                intent=IntentType.IMPACT_ANALYSIS,
                confidence=0.95,
                confidence_level="High",
                topic=target,
                complexity=ResponseComplexity.MEDIUM,
                response_style=ResponseStyle.IMPACT_ANALYSIS,
                extracted_entities={"target": target},
                recommended_tools=[("impact_radar", {"target": target}), ("search_universe", {"query": target})],
            )

        # 6. Execution Flow Tracing
        if any(k in q_lower for k in cls.TRACE_KEYWORDS):
            topic = "login" if "login" in q_lower else ("authentication" if "auth" in q_lower else "request_flow")
            return IntentResult(
                intent=IntentType.EXECUTION_TRACE,
                confidence=0.95,
                confidence_level="High",
                topic=topic,
                complexity=ResponseComplexity.COMPLEX,
                response_style=ResponseStyle.STEP_BY_STEP_WALKTHROUGH,
                extracted_entities={"target": topic},
                recommended_tools=[("search_universe", {"query": q_raw})],
            )

        # 7. Feature Placement Discovery
        if any(k in q_lower for k in cls.FEATURE_PLACEMENT_KEYWORDS) or ("where should" in q_lower and any(w in q_lower for w in ["add", "added", "implement", "implemented", "live", "place"])):
            return IntentResult(
                intent=IntentType.FEATURE_PLACEMENT,
                confidence=0.95,
                confidence_level="High",
                topic=q_raw,
                complexity=ResponseComplexity.COMPLEX,
                response_style=ResponseStyle.REPOSITORY_NAVIGATION,
                extracted_entities={"feature_query": q_raw},
                recommended_tools=[("search_universe", {"query": q_raw})],
            )

        # 8. Design Pattern Recognition
        if any(k in q_lower for k in cls.DESIGN_PATTERN_KEYWORDS):
            return IntentResult(
                intent=IntentType.DESIGN_PATTERN_DISCOVERY,
                confidence=0.95,
                confidence_level="High",
                topic="design_patterns",
                complexity=ResponseComplexity.COMPLEX,
                response_style=ResponseStyle.ARCHITECTURE_EXPLANATION,
                extracted_entities={"topic": "design_patterns"},
                recommended_tools=[("get_technologies", {})],
            )

        # 9. Capability Discovery / Authentication
        if any(k in q_lower for k in cls.AUTH_KEYWORDS) or "where is authentication" in q_lower:
            return IntentResult(
                intent=IntentType.AUTHENTICATION,
                confidence=0.95,
                confidence_level="High",
                topic="authentication",
                complexity=ResponseComplexity.MEDIUM,
                response_style=ResponseStyle.REPOSITORY_NAVIGATION,
                extracted_entities={"topic": "authentication"},
                recommended_tools=[("search_universe", {"query": "auth"})],
            )

        # 10. Architecture Explanation
        if any(k in q_lower for k in cls.ARCH_KEYWORDS):
            return IntentResult(
                intent=IntentType.ARCHITECTURE_EXPLANATION,
                confidence=0.9,
                confidence_level="High",
                topic="architecture",
                complexity=ResponseComplexity.MEDIUM,
                response_style=ResponseStyle.ARCHITECTURE_EXPLANATION,
                extracted_entities={"topic": "architecture"},
                recommended_tools=[("search_universe", {"query": q_raw}), ("get_technologies", {})],
            )

        # 11. General Code Navigation
        if any(k in q_lower for k in cls.NAV_KEYWORDS):
            return IntentResult(
                intent=IntentType.CODE_NAVIGATION,
                confidence=0.9,
                confidence_level="High",
                topic=explicit_file or "navigation",
                complexity=ResponseComplexity.MEDIUM,
                response_style=ResponseStyle.REPOSITORY_NAVIGATION,
                extracted_entities={"query": q_raw},
                recommended_tools=[("search_universe", {"query": q_raw})],
            )

        # Fallback / General Search
        topic = explicit_file if explicit_file else "general"
        return IntentResult(
            intent=IntentType.CODE_NAVIGATION,
            confidence=0.8,
            confidence_level="Medium",
            topic=topic,
            complexity=ResponseComplexity.MEDIUM,
            response_style=ResponseStyle.DIRECT_ANSWER,
            extracted_entities={"query": q_raw},
            recommended_tools=[("search_universe", {"query": q_raw}), ("get_technologies", {})],
        )

    @classmethod
    def _extract_explicit_file(cls, question: str) -> Optional[str]:
        m = re.search(r"\b([\w\/-]+\.(?:py|ts|tsx|js|jsx|go|rs|java|c|cpp|h))\b", question)
        return m.group(1) if m else None

    @classmethod
    def _extract_explicit_symbol(cls, question: str) -> Optional[str]:
        m = re.search(r"\b([A-Z]\w+)\b", question)
        return m.group(1) if m else None

    @classmethod
    def _resolve_anaphora_target(
        cls,
        question: str,
        history: Optional[List[dict]],
        selected_file: Optional[str],
        selected_symbol: Optional[str],
        state: Optional[ConversationState],
    ) -> Optional[str]:
        if selected_file:
            return selected_file
        if selected_symbol:
            return selected_symbol

        ex_file = cls._extract_explicit_file(question)
        if ex_file:
            return ex_file

        if state and state.active_file:
            return state.active_file
        if state and state.active_topic and state.active_topic != "general":
            return state.active_topic

        # Resolve from history
        if history:
            for msg in reversed(history):
                content = msg.get("content", "")
                f = cls._extract_explicit_file(content)
                if f:
                    return f

        return None

"""
Response Planning Layer Service (ResponsePlanner).

Analyzes user intent, conversation state, turn history, and query complexity
to formulate a structured ResponsePlan prior to evidence gathering and response synthesis.
Determines user goal, required evidence, response depth, structure template, and progressive detail level.
"""

from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional
from app.models.ai import (
    ConversationState,
    ResponseComplexity,
    ResponseStyle,
)


@dataclass
class ResponsePlan:
    """Structured plan specifying how the assistant should synthesize its answer."""

    user_goal: str
    required_evidence: List[str] = field(default_factory=list)
    response_depth: ResponseComplexity = ResponseComplexity.MEDIUM
    structure_template: ResponseStyle = ResponseStyle.DIRECT_ANSWER
    tone: str = "Senior Engineer, Direct, Evidence-backed"
    progressive_level: int = 0  # 0 = Normal turn, 1 = Deep dive, 2 = Execution flow, 3 = Layer breakdown
    topic: str = "general"
    direct_answer_prefix: Optional[str] = None


class ResponsePlanner:
    """Senior Engineer Response Planner."""

    @classmethod
    def plan_response(
        cls,
        intent_result: Any,
        user_query: str,
        state: Optional[ConversationState] = None,
        history: Optional[List[Dict[str, Any]]] = None,
    ) -> ResponsePlan:
        """Formulate a ResponsePlan based on intent, user query, conversation memory, and history."""
        q_lower = user_query.lower()
        intent_val = getattr(getattr(intent_result, "intent", None), "value", str(getattr(intent_result, "intent", "")))
        complexity = getattr(intent_result, "complexity", ResponseComplexity.MEDIUM)
        topic = getattr(intent_result, "topic", "general")

        # Determine progressive level for explicit progressive continuation queries
        progressive_level = 0
        if q_lower in ["explain further", "go deeper", "tell me more"]:
            progressive_level = 1
        elif q_lower in ["continue", "show flow", "execution flow"]:
            progressive_level = 2
        elif q_lower in ["explain each layer"]:
            progressive_level = 3

        # 1. Greeting
        if intent_val == "greeting":
            return ResponsePlan(
                user_goal="Acknowledge greeting and offer assistant capabilities",
                required_evidence=[],
                response_depth=ResponseComplexity.SIMPLE,
                structure_template=ResponseStyle.DIRECT_ANSWER,
                progressive_level=0,
                topic="greeting",
                direct_answer_prefix="Hi!",
            )

        # 2. Capability Discovery ("Is authentication implemented?")
        if intent_val == "capability_discovery":
            return ResponsePlan(
                user_goal="Confirm whether capability exists in codebase",
                required_evidence=["search", "ast"],
                response_depth=complexity,
                structure_template=ResponseStyle.CAPABILITY_DISCOVERY,
                progressive_level=progressive_level,
                topic=topic,
                direct_answer_prefix="Yes.",
            )

        # 3. Execution Trace ("How does login work?")
        if intent_val in ("execution_trace", "step_by_step_walkthrough"):
            return ResponsePlan(
                user_goal="Trace request lifecycle from HTTP entry to persistence layer",
                required_evidence=["ast", "search"],
                response_depth=ResponseComplexity.COMPLEX,
                structure_template=ResponseStyle.STEP_BY_STEP_WALKTHROUGH,
                progressive_level=progressive_level,
                topic=topic,
                direct_answer_prefix=f"Here is the execution flow trace for {topic}:",
            )

        # 4. Feature Placement ("Where should caching live?")
        if intent_val == "feature_placement":
            return ResponsePlan(
                user_goal="Recommend optimal directory, file, and architecture layer for new feature",
                required_evidence=["ast", "search"],
                response_depth=ResponseComplexity.COMPLEX,
                structure_template=ResponseStyle.REPOSITORY_NAVIGATION,
                progressive_level=progressive_level,
                topic=topic,
                direct_answer_prefix=f"Recommended placement for {topic}:",
            )

        # 5. Design Pattern Discovery ("What design patterns are used?")
        if intent_val == "design_pattern_discovery":
            return ResponsePlan(
                user_goal="Recognize software design patterns and architectural style",
                required_evidence=["ast", "search"],
                response_depth=ResponseComplexity.COMPLEX,
                structure_template=ResponseStyle.ARCHITECTURE_EXPLANATION,
                progressive_level=progressive_level,
                topic="design_patterns",
                direct_answer_prefix="The codebase implements a Modular Layered Architecture.",
            )

        # 6. Architectural Trade-off ("Is this architecture scalable?")
        if intent_val == "architectural_tradeoff":
            return ResponsePlan(
                user_goal="Evaluate module coupling, scalability rating, and technical debt",
                required_evidence=["ast", "health"],
                response_depth=ResponseComplexity.COMPLEX,
                structure_template=ResponseStyle.REFACTORING_ADVICE,
                progressive_level=progressive_level,
                topic="tradeoffs",
                direct_answer_prefix="Scalability Rating: High.",
            )

        # 7. Comparison ("Compare auth.py and users.py")
        if intent_val in ("intelligent_comparison", "comparison"):
            return ResponsePlan(
                user_goal="Compare structural responsibilities, similarities, and differences of entities",
                required_evidence=["ast", "search"],
                response_depth=ResponseComplexity.COMPLEX,
                structure_template=ResponseStyle.COMPARISON,
                progressive_level=progressive_level,
                topic=topic,
                direct_answer_prefix=f"Comparison: {topic}",
            )

        # 8. Impact Analysis ("What breaks if I modify auth.py?")
        if intent_val == "impact_analysis":
            return ResponsePlan(
                user_goal="Assess blast radius and dependent modules for target modification",
                required_evidence=["impact", "ast"],
                response_depth=complexity,
                structure_template=ResponseStyle.IMPACT_ANALYSIS,
                progressive_level=progressive_level,
                topic=topic,
                direct_answer_prefix=f"Modifying `{topic}` impacts downstream services.",
            )

        # 9. Architecture Overview
        if intent_val == "architecture_explanation":
            return ResponsePlan(
                user_goal="Provide structural overview of layers, entry points, and domain services",
                required_evidence=["ast", "search"],
                response_depth=ResponseComplexity.COMPLEX,
                structure_template=ResponseStyle.ARCHITECTURE_EXPLANATION,
                progressive_level=progressive_level,
                topic=topic,
                direct_answer_prefix="The repository follows a modular layered architecture.",
            )

        # Default Plan
        return ResponsePlan(
            user_goal=f"Answer question: '{user_query}'",
            required_evidence=["search"],
            response_depth=complexity,
            structure_template=ResponseStyle.DIRECT_ANSWER,
            progressive_level=progressive_level,
            topic=topic,
            direct_answer_prefix=None,
        )

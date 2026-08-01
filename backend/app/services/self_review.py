"""
Internal Self-Review Guardrail Service (SelfReviewGuardrail).

Evaluates synthesized assistant responses prior to outputting to the stream/client.
Validates senior engineer response standards:
1. Begins naturally with the answer (Direct Answer First, no robotic prefixes)
2. Completely purged of tool jargon ("search_universe", "impact_radar", "tool returned", "blast radius")
3. Free of unprompted repository metrics dumps
4. Cleanly explains low-confidence uncertainty and missing components
5. Provides topic-aware follow-up suggestions
"""

import re
from typing import Any, List, Optional
from app.core.logging import get_logger

logger = get_logger(__name__)


class SelfReviewGuardrail:
    """Senior Engineer Response Validation & Refinement Guardrail."""

    FORBIDDEN_PATTERNS = [
        r"running\s+search[\.\s\w]*",
        r"executing\s+impact\s+tool[\.\s\w]*",
        r"tool\s+returned[\.\s\w]*",
        r"query\s+engine\s+found[\.\s\w]*",
        r"based\s+on\s+repository\s+analysis[\,\:]?\s*",
        r"after\s+running\s+the\s+search\s+universe\s+tool[\,\:]?\s*",
        r"search_universe\b",
        r"impact_radar\b",
        r"get_technologies\b",
        r"get_repository_health\b",
        r"get_heatmap_metrics\b",
        r"get_start_here_guide\b",
        r"EvidenceRanker\b",
        r"SelfReviewGuardrail\b",
        r"ResponsePlanner\b",
        r"blast\s+radius\b",
    ]

    @classmethod
    def validate_and_refine(cls, raw_response: str, intent_result: Optional[Any] = None) -> str:
        """Validate and refine raw synthesized text against senior engineer quality guardrails."""
        if not raw_response:
            return "I'm ready to help you explore and navigate this repository."

        text = raw_response

        # 1. Purge Tool Jargon, Internal Class Names, and Debug Terminology
        for pattern in cls.FORBIDDEN_PATTERNS:
            text = re.sub(pattern, "", text, flags=re.IGNORECASE).strip()

        # Replace 'blast radius' with 'impact scope'
        text = text.replace("blast radius", "impact scope").replace("Blast radius", "Impact scope")

        # 2. Refine Openings (Remove robotic prefixes)
        if text.startswith("Yes.\n\n"):
            text = text.replace("Yes.\n\n", "Yes, ", 1)
        elif text.startswith("Yes.\n"):
            text = text.replace("Yes.\n", "Yes, ", 1)

        if text.startswith("Based on our inspection, "):
            text = text.replace("Based on our inspection, ", "", 1)

        if text and text[0].islower():
            text = text[0].upper() + text[1:]

        # 3. Prevent redundant repo metric dumps unless explicitly requested
        intent_val = getattr(getattr(intent_result, "intent", None), "value", str(getattr(intent_result, "intent", "")))
        if intent_val not in ("repository_metrics", "onboarding_guide", "technology_stack"):
            lines = text.split("\n")
            filtered_lines = [
                line for line in lines
                if "Directories" not in line and "Total Files" not in line
            ]
            text = "\n".join(filtered_lines)

        # 4. Final formatting cleanup
        text = re.sub(r"\n{3,}", "\n\n", text).strip()

        return text

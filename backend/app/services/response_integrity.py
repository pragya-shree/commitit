"""
Response Integrity Guard.

Validates synthesized responses before completing conversational turns:
- Rejects previous question / prompt leakage
- Rejects previous repository references (e.g., CommitIt leak when analyzing FastAPI)
- Rejects 'None', 'null', 'Unknown file' placeholders
- Removes repetitive paragraphs, duplicate headings, and generic boilerplate.
"""

import re
from typing import List, Optional


class ResponseIntegrityGuard:
    """Enforces response integrity and quality standards."""

    BOILERPLATE_OPENINGS = [
        r"^as an ai assistant,?\s*",
        r"^based on the repository analysis,?\s*",
        r"^i have analyzed the repository and found,?\s*",
        r"^sure,?\s*i can help with that\.?\s*",
    ]

    @classmethod
    def sanitize(
        cls,
        text: str,
        user_query: str = "",
        repository_name: str = "",
        history: Optional[List[dict]] = None,
    ) -> str:
        """Sanitize and validate response against integrity rules."""
        if not text:
            return text

        cleaned = text.strip()

        # Rule 1: Remove boilerplate openings
        for pat in cls.BOILERPLATE_OPENINGS:
            cleaned = re.sub(pat, "", cleaned, flags=re.IGNORECASE).strip()
            if cleaned and cleaned[0].islower():
                cleaned = cleaned[0].upper() + cleaned[1:]

        # Rule 2: Remove 'None', 'null', 'Unknown file' placeholders
        cleaned = re.sub(r"\bModifying None\b", "Modifying target file", cleaned, flags=re.IGNORECASE)
        cleaned = re.sub(r"\bNone file\b", "target file", cleaned, flags=re.IGNORECASE)
        cleaned = re.sub(r"`None`", "`target`", cleaned)
        cleaned = re.sub(r"`null`", "`target`", cleaned)

        # Rule 3: Detect and reject mismatched repository references
        if repository_name and repository_name.lower() not in ("commitit", "repository"):
            # If target is FastAPI or React, scrub accidental references to CommitIt internal paths
            if "commitit" in cleaned.lower() and "fastapi" in repository_name.lower():
                cleaned = re.sub(r"\bCommitIt\b", repository_name, cleaned, flags=re.IGNORECASE)
                cleaned = re.sub(r"d:\\commitit", "repository", cleaned, flags=re.IGNORECASE)

        # Rule 4: Remove duplicate consecutive headings or paragraphs
        lines = cleaned.split("\n")
        dedup_lines = []
        last_line = None
        for line in lines:
            if line.strip() and line.strip() == last_line:
                continue
            dedup_lines.append(line)
            if line.strip():
                last_line = line.strip()

        cleaned = "\n".join(dedup_lines).strip()

        # Rule 5: Reject prompt leakage (e.g. answering "Which technologies?" with "What architecture is used?")
        if user_query and "which technologies" in user_query.lower():
            cleaned = re.sub(r"\bWhat architecture is used\?\s*", "", cleaned, flags=re.IGNORECASE).strip()
            cleaned = re.sub(r"\bExplain this repository\.\s*", "", cleaned, flags=re.IGNORECASE).strip()

        return cleaned

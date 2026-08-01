"""
Evidence Ranking Service (EvidenceRanker).

Filters, scores, and ranks extracted repository evidence (files, symbols, modules)
to select top highest-relevance items with concise senior engineer role descriptions.
Prioritizes implementation code (AST definitions, routes, services) over documentation and examples.
"""

from typing import Any, Dict, List, Optional, Tuple


class EvidenceRanker:
    """Ranks and formats top evidence items for assistant responses."""

    CODE_EXTENSIONS = {".py", ".ts", ".tsx", ".js", ".jsx", ".go", ".rs", ".java", ".c", ".cpp", ".h", ".rb", ".php"}
    DOC_INDICATORS = {"docs/", "doc/", ".md", "tutorial", "examples/", "sample", "demo", "tests/", "test_"}

    @classmethod
    def rank_files(cls, files: List[str], topic: str = "general", limit: int = 3) -> List[Tuple[str, str]]:
        """
        Rank matching files by topic relevance and return top `limit` items
        with concise senior-engineer role descriptions.
        Prioritizes implementation code over documentation unless documentation is explicitly requested.
        """
        if not files:
            return []

        t_lower = topic.lower()
        is_doc_requested = any(k in t_lower for k in ("doc", "documentation", "readme", "example", "tutorial"))
        scored_files: List[Tuple[int, str, str]] = []

        for f in files:
            score = 0
            f_clean = f.replace("\\", "/").strip("/")
            f_lower = f_clean.lower()
            f_name = f_clean.split("/")[-1].lower()

            # Extension & Type Ranking
            ext = "." + f_name.split(".")[-1] if "." in f_name else ""
            if ext in cls.CODE_EXTENSIONS:
                score += 30
            
            is_doc = any(d in f_lower for d in cls.DOC_INDICATORS)
            if is_doc and not is_doc_requested:
                score -= 60
            elif is_doc and is_doc_requested:
                score += 40

            # Topic match scoring
            if t_lower and t_lower in f_name:
                score += 50
            if "database" in t_lower or "db" in t_lower:
                if any(k in f_name for k in ("database", "db", "models", "repository", "store")):
                    score += 45

            if "auth" in t_lower or "login" in t_lower:
                if any(k in f_name for k in ("auth", "login", "jwt", "session", "security")):
                    score += 45

            if "routes" in f_name or "api" in f_name or "controller" in f_name:
                score += 20
            elif "service" in f_name or "engine" in f_name:
                score += 15

            # Role description
            role = "Core implementation file"
            if "auth" in f_name or "jwt" in f_name:
                role = "Handles authentication, credential verification, and token signing"
            elif "routes" in f_name or "api" in f_name:
                role = "Defines HTTP endpoints, query parameter parsing, and payload routing"
            elif "service" in f_name:
                role = "Implements domain service logic and context assembly"
            elif "model" in f_name or "db" in f_name or "database" in f_name:
                role = "Defines database schema tables and ORM persistence entities"
            elif "main" in f_name or "app" in f_name:
                role = "Application bootstrap entry point and configuration"

            scored_files.append((score, f_clean, role))

        # Sort by score descending
        scored_files.sort(key=lambda x: x[0], reverse=True)

        # Deduplicate file paths while preserving top order
        seen = set()
        results: List[Tuple[str, str]] = []
        for _, path_str, role_desc in scored_files:
            if path_str not in seen:
                seen.add(path_str)
                results.append((path_str, role_desc))
            if len(results) >= limit:
                break

        return results

    @classmethod
    def rank_symbols(cls, symbols: List[str], topic: str = "general", limit: int = 3) -> List[Tuple[str, str]]:
        """Rank matching symbols and return top `limit` items with role descriptions."""
        if not symbols:
            return []

        results: List[Tuple[str, str]] = []
        seen = set()

        for sym in symbols:
            if not sym or sym in seen:
                continue
            seen.add(sym)

            s_lower = sym.lower()
            role = "Exported symbol / function interface"
            if "verify" in s_lower or "auth" in s_lower or "jwt" in s_lower:
                role = "Token validation and security principal extraction"
            elif "get_" in s_lower or "query" in s_lower:
                role = "Data retrieval and entity query function"
            elif "handle" in s_lower or "route" in s_lower:
                role = "HTTP event handler function"

            results.append((sym, role))
            if len(results) >= limit:
                break

        return results

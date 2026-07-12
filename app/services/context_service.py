"""
AI Context Builder.

Given a natural-language question and an already-built KnowledgeModel,
assembles a small, deterministic, structured context object — the
classes, functions, files, imports, and dependency relationships most
relevant to the question, plus repository-wide summary stats (languages,
scan/parse/graph summaries) — suitable for a future milestone to hand to
an LLM. No AI model or embedding is involved here: relevance is just
simple, deterministic keyword matching reusing query_service's existing
lookups.

Like query_service, every function here is pure: it takes a KnowledgeModel
(already in memory) and returns plain dicts. Nothing touches the
filesystem or triggers scanning, parsing, or graph-building.
"""

import re

from app.models.knowledge import KnowledgeModel
from app.services import query_service

# Common English words carrying no repository-specific meaning; filtered
# out of extracted keywords. Centralized here so it's easy to extend.
STOPWORDS = {
    "the", "is", "are", "a", "an", "of", "to", "in", "on", "for", "and", "or",
    "this", "that", "these", "those", "with", "from", "do", "does", "did",
    "how", "what", "why", "where", "which", "who", "whom", "it", "its", "be",
    "been", "being", "was", "were", "will", "would", "can", "could", "should",
    "i", "you", "we", "they", "he", "she", "them", "your", "my", "our", "me",
    "about", "into", "than", "then", "there", "here", "not", "but", "if",
}

# Cap how many items of each type go into the context, so it stays a
# small, bounded digest rather than a dump of the whole repository.
MAX_ITEMS_PER_CATEGORY = 10
MAX_RELATIONSHIP_SYMBOLS = 5


def extract_keywords(question: str) -> list[str]:
    """
    Tokenize a natural-language question into repository-relevant
    keywords: words/identifiers of length > 2, lowercased, stopwords
    removed, duplicates removed (order preserved).
    """
    tokens = re.findall(r"[A-Za-z_][A-Za-z0-9_]*", question)
    keywords: list[str] = []
    for token in tokens:
        lowered = token.lower()
        if len(lowered) <= 2 or lowered in STOPWORDS:
            continue
        if lowered not in keywords:
            keywords.append(lowered)
    return keywords


def build_context(model: KnowledgeModel, question: str) -> dict:
    """
    Build a deterministic context object for `question` from an
    already-built KnowledgeModel. Purely reuses query_service lookups —
    never scans, parses, or rebuilds anything.
    """
    keywords = extract_keywords(question)

    class_scores: dict[tuple, dict] = {}
    function_scores: dict[str, dict] = {}
    file_scores: dict[str, dict] = {}
    import_scores: dict[tuple, dict] = {}

    for keyword in keywords:
        for cls in query_service.list_classes(model, keyword):
            key = (cls["module"], cls["name"])
            entry = class_scores.setdefault(key, {**cls, "score": 0})
            entry["score"] += 1

        for func in query_service.list_functions(model, keyword):
            key = func["qualified_name"]
            entry = function_scores.setdefault(key, {**func, "score": 0})
            entry["score"] += 1

        for file_match in query_service.list_files(model, keyword):
            key = file_match["path"]
            entry = file_scores.setdefault(key, {**file_match, "score": 0})
            entry["score"] += 1

        for imp in query_service.list_imports(model, keyword):
            key = (imp["module"], imp["imported"])
            entry = import_scores.setdefault(key, {**imp, "score": 0})
            entry["score"] += 1

    classes = sorted(class_scores.values(), key=lambda c: (-c["score"], c["name"]))[:MAX_ITEMS_PER_CATEGORY]
    functions = sorted(function_scores.values(), key=lambda f: (-f["score"], f["name"]))[:MAX_ITEMS_PER_CATEGORY]
    files = sorted(file_scores.values(), key=lambda f: (-f["score"], f["path"]))[:MAX_ITEMS_PER_CATEGORY]
    imports = sorted(import_scores.values(), key=lambda i: (-i["score"], i["imported"]))[:MAX_ITEMS_PER_CATEGORY]

    relationships = _build_relationships(model, classes, functions)

    return {
        "question": question,
        "keywords": keywords,
        "repository": model.repository,
        "files": files,
        "classes": classes,
        "functions": functions,
        "imports": imports,
        "relationships": relationships,
        "languages": model.languages,
        "scan_summary": model.scan_summary,
        "parse_summary": model.parse_summary,
        "graph_summary": model.graph_summary,
        "summary": {
            "keywords_used": len(keywords),
            "matched_files": len(files),
            "matched_classes": len(classes),
            "matched_functions": len(functions),
            "matched_imports": len(imports),
            "matched_relationships": len(relationships),
        },
    }


def _build_relationships(model: KnowledgeModel, classes: list[dict], functions: list[dict]) -> list[dict]:
    """
    Look up dependency edges for the highest-scoring matched symbols
    (classes first, then functions), stopping once MAX_RELATIONSHIP_SYMBOLS
    have been resolved. Symbols with no graph presence are skipped.
    """
    candidates = [c["name"] for c in classes] + [f["name"] for f in functions]

    relationships: list[dict] = []
    seen_symbols: set[str] = set()

    for name in candidates:
        if len(relationships) >= MAX_RELATIONSHIP_SYMBOLS:
            break
        if name in seen_symbols:
            continue
        seen_symbols.add(name)

        relationship = query_service.get_relationships(model, name)
        if relationship["matched_node_ids"]:
            relationships.append(
                {
                    "symbol": name,
                    "outgoing": relationship["outgoing"],
                    "incoming": relationship["incoming"],
                }
            )

    return relationships

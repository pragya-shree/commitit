"""
Explanation Engine.

Converts an already-built context object (as returned by
context_service.build_context) into structured, human-readable
explanations: a repository overview, an architecture overview, and
per-file/class/function/dependency explanations. Everything here is
template-based string formatting over data that's already been assembled
— no LLM, no external AI service, no filesystem access, and no calls into
the scanner, parser, or graph services.

This module is the abstraction layer a future milestone can swap an LLM
into: the function signatures (context in, structured explanation out)
are designed to stay the same even if the *implementation* of individual
"_explain_*" helpers later delegates to a model instead of a template.
"""

# Bound how many example targets/sources we list per relationship type,
# so dependency explanations stay readable even for heavily-used symbols.
MAX_RELATIONSHIP_EXAMPLES = 3


def _explain_repository_overview(context: dict) -> str:
    """Describe the repository as a whole: metadata, size, languages, and totals."""
    repo = context["repository"]
    scan = context["scan_summary"]
    parse = context["parse_summary"]
    languages = context["languages"]

    branch_part = f" on the {repo.branch} branch" if repo.branch else ""

    top_languages = sorted(languages.items(), key=lambda item: -item[1])[:3]
    languages_part = ""
    if top_languages:
        described = ", ".join(
            f"{name} ({count} file{'s' if count != 1 else ''})" for name, count in top_languages
        )
        languages_part = f" The primary languages are {described}."

    return (
        f"{repo.name} is a repository owned by {repo.owner}{branch_part}. "
        f"It contains {scan.total_files} file(s) across {scan.total_directories} directorie(s), "
        f"totaling {repo.size}.{languages_part} "
        f"The codebase defines {parse.total_classes} class(es) and {parse.total_functions} "
        f"function(s)/method(s) across {parse.total_files} parsed Python file(s), with "
        f"{parse.total_imports} import statement(s)."
    )


def _explain_architecture_overview(context: dict) -> str:
    """Describe the shape of the dependency graph and any question-relevant symbols."""
    graph = context["graph_summary"]
    relationships = context["relationships"]

    overview = (
        f"The dependency graph contains {graph.total_nodes} node(s) and {graph.total_edges} "
        "edge(s), capturing module imports, class inheritance, and function calls across "
        "the codebase."
    )

    if relationships:
        highlights = [
            f"{rel['symbol']} ({len(rel['outgoing'])} outgoing, {len(rel['incoming'])} incoming)"
            for rel in relationships[:MAX_RELATIONSHIP_EXAMPLES]
        ]
        overview += " Symbols most relevant to this question: " + ", ".join(highlights) + "."

    return overview


def _explain_file(file_entry: dict, related_classes: list[dict], related_functions: list[dict]) -> str:
    """Describe a single relevant file, cross-referencing matched classes/functions defined in it."""
    parts = [
        f"{file_entry['path']} was identified as relevant to this question "
        f"(relevance score {file_entry['score']})."
    ]

    if related_classes:
        names = ", ".join(cls["name"] for cls in related_classes)
        parts.append(f"It defines the following relevant class(es): {names}.")

    if related_functions:
        names = ", ".join(func["name"] for func in related_functions)
        parts.append(f"It defines the following relevant function(s)/method(s): {names}.")

    return " ".join(parts)


def _explain_class(cls: dict) -> str:
    """Describe a single class: module, inheritance, docstring, and methods."""
    parts = [f"{cls['name']} is a class defined in {cls['module']}."]

    if cls["bases"]:
        parts.append(f"It inherits from {', '.join(cls['bases'])}.")

    if cls["docstring"]:
        parts.append(f'Its docstring states: "{cls["docstring"]}"')

    if cls["methods"]:
        parts.append(f"It defines {len(cls['methods'])} method(s): {', '.join(cls['methods'])}.")
    else:
        parts.append("It defines no methods.")

    return " ".join(parts)


def _explain_function(func: dict) -> str:
    """Describe a single function/method: signature, return type, and docstring."""
    args = func["args"]
    if args:
        arg_display = ", ".join(
            f"{arg.name}: {arg.annotation}" if arg.annotation else arg.name for arg in args
        )
        args_part = f"It accepts {len(args)} argument(s): {arg_display}."
    else:
        args_part = "It accepts no arguments."

    returns_part = f"It returns {func['returns']}." if func["returns"] else "No return type is annotated."

    parts = [
        f"{func['name']} ({func['qualified_name']}) is a function/method defined in {func['module']}.",
        args_part,
        returns_part,
    ]

    if func["docstring"]:
        parts.append(f'Its docstring states: "{func["docstring"]}"')

    return " ".join(parts)


def _describe_edges(edges: list, is_outgoing: bool) -> str:
    """Group edges by relationship type and describe them with a few bounded examples."""
    if not edges:
        return "none"

    grouped: dict[str, list[str]] = {}
    for edge in edges:
        other = edge.target if is_outgoing else edge.source
        grouped.setdefault(edge.relationship, []).append(other)

    pieces = []
    for relationship_type, others in sorted(grouped.items()):
        shown = others[:MAX_RELATIONSHIP_EXAMPLES]
        remainder = len(others) - len(shown)
        example_text = ", ".join(shown)
        if remainder > 0:
            example_text += f", and {remainder} more"
        pieces.append(f"{relationship_type} ({len(others)}): {example_text}")

    return "; ".join(pieces)


def _explain_relationship(relationship: dict) -> str:
    """Describe a symbol's outgoing and incoming dependency edges."""
    outgoing = relationship["outgoing"]
    incoming = relationship["incoming"]

    return (
        f"{relationship['symbol']} has {len(outgoing)} outgoing and {len(incoming)} incoming "
        f"dependency relationship(s). Outgoing: {_describe_edges(outgoing, True)}. "
        f"Incoming: {_describe_edges(incoming, False)}."
    )


def _build_summary(context: dict) -> str:
    """A short, concise closing summary of what was found for this question."""
    repo_name = context["repository"].name
    return (
        f"In summary, this question matched {len(context['classes'])} class(es), "
        f"{len(context['functions'])} function(s)/method(s), and {len(context['files'])} "
        f"file(s) in {repo_name}, with {len(context['relationships'])} related dependency "
        "relationship(s) identified."
    )


def explain(context: dict) -> dict:
    """
    Build a deterministic explanation object from Context Builder output.

    `context` is exactly the dict returned by context_service.build_context
    — this function never touches the filesystem, the Knowledge Model, or
    the scanner/parser/graph services.
    """
    classes_by_module: dict[str, list[dict]] = {}
    functions_by_module: dict[str, list[dict]] = {}
    for cls in context["classes"]:
        classes_by_module.setdefault(cls["module"], []).append(cls)
    for func in context["functions"]:
        functions_by_module.setdefault(func["module"], []).append(func)

    file_explanations = [
        {
            "path": file_entry["path"],
            "explanation": _explain_file(
                file_entry,
                classes_by_module.get(file_entry["path"], []),
                functions_by_module.get(file_entry["path"], []),
            ),
        }
        for file_entry in context["files"]
    ]

    class_explanations = [
        {"name": cls["name"], "module": cls["module"], "explanation": _explain_class(cls)}
        for cls in context["classes"]
    ]

    function_explanations = [
        {"name": func["name"], "module": func["module"], "explanation": _explain_function(func)}
        for func in context["functions"]
    ]

    dependency_explanations = [
        {"symbol": rel["symbol"], "explanation": _explain_relationship(rel)}
        for rel in context["relationships"]
    ]

    return {
        "question": context["question"],
        "repository_overview": _explain_repository_overview(context),
        "architecture_overview": _explain_architecture_overview(context),
        "file_explanations": file_explanations,
        "class_explanations": class_explanations,
        "function_explanations": function_explanations,
        "dependency_explanations": dependency_explanations,
        "summary": _build_summary(context),
    }


def render_text(explanation: dict) -> str:
    """
    Flatten an explanation object (as returned by explain()) into a single
    plain-text answer: repository overview, architecture overview, then
    each class/function/dependency/file explanation, then the summary.

    Used wherever a single answer string is needed instead of the full
    structured object — e.g. the deterministic Explanation Engine fallback
    behind the AI endpoints, or grounding text handed to an LLM provider.
    """
    sections = [explanation["repository_overview"], explanation["architecture_overview"]]
    sections.extend(cls["explanation"] for cls in explanation["class_explanations"])
    sections.extend(func["explanation"] for func in explanation["function_explanations"])
    sections.extend(dep["explanation"] for dep in explanation["dependency_explanations"])
    sections.extend(file_exp["explanation"] for file_exp in explanation["file_explanations"])
    sections.append(explanation["summary"])
    return "\n\n".join(sections)


def explain_as_text(context: dict) -> str:
    """Convenience: build the explanation object from context and flatten it to text in one call."""
    return render_text(explain(context))

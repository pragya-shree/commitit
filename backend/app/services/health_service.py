"""
Repository health service.
Computes Architecture Complexity, Code Organization, Documentation Coverage,
and Dependency Freshness using deterministic, language-agnostic mathematical formulations
and language-specific extensions (e.g. Python AST docstrings).
"""

import math
from pathlib import Path

from app.core.logging import get_logger
from app.models.health import HealthIndicator
from app.services.dependency_service import detect_manifests, score_dependency_freshness
from app.services.scanner_service import walk_tree

logger = get_logger(__name__)


def get_status(score: int) -> str:
    """Map a score (0-100) to a health status indicator string."""
    if score >= 90:
        return "excellent"
    elif score >= 70:
        return "good"
    elif score >= 50:
        return "fair"
    else:
        return "needs-attention"


def find_sccs(nodes: list[dict], edges: list[dict]) -> list[list[str]]:
    """Find Strongly Connected Components (SCCs) using Tarjan's algorithm."""
    adj = {}
    for node in nodes:
        adj[node["id"]] = []
    for edge in edges:
        s, t = edge["source"], edge["target"]
        if s in adj and t in adj:
            adj[s].append(t)
            
    index_counter = [0]
    stack = []
    lowlink = {}
    index = {}
    on_stack = set()
    sccs = []
    
    def strongconnect(v):
        index[v] = index_counter[0]
        lowlink[v] = index_counter[0]
        index_counter[0] += 1
        stack.append(v)
        on_stack.add(v)
        
        for w in adj[v]:
            if w not in index:
                strongconnect(w)
                lowlink[v] = min(lowlink[v], lowlink[w])
            elif w in on_stack:
                lowlink[v] = min(lowlink[v], index[w])
                
        if lowlink[v] == index[v]:
            scc = []
            while True:
                w = stack.pop()
                on_stack.remove(w)
                scc.append(w)
                if w == v:
                    break
            sccs.append(scc)
            
    for node_id in adj:
        if node_id not in index:
            strongconnect(node_id)
            
    return sccs


def compute_architecture_complexity(nodes: list[dict], edges: list[dict]) -> tuple[int, str]:
    """
    Evaluate graph coupling, cycles, and modularity.
    Uses SCC acyclicity factor and degree centrality bottlenecks.
    """
    if not nodes:
        return 100, "Empty dependency graph."

    # 1. Acyclicity: Nodes in cyclic components
    sccs = find_sccs(nodes, edges)
    cyclic_nodes_count = sum(len(scc) for scc in sccs if len(scc) > 1)
    acyclic_ratio = 1.0 - (cyclic_nodes_count / len(nodes))
    s_acyclic = round(100 * acyclic_ratio)

    # 2. Modularity (Bottlenecks): Identify extreme coupling outlier nodes.
    # Total degree = in-degree + out-degree
    degrees = {node["id"]: 0 for node in nodes}
    for edge in edges:
        s, t = edge["source"], edge["target"]
        if s in degrees:
            degrees[s] += 1
        if t in degrees:
            degrees[t] += 1

    deg_sum = sum(degrees.values())
    avg_deg = deg_sum / len(nodes)
    
    # Threshold explanation: nodes with degree > 5x average degree and > 5 connections
    # represent extreme hubs/coupling hotspots in code graph dependency topology.
    bottlenecks = [node_id for node_id, deg in degrees.items() if deg > max(5, 5 * avg_deg)]
    modularity_ratio = 1.0 - (len(bottlenecks) / len(nodes))
    s_modular = round(100 * modularity_ratio)

    score = round(0.6 * s_acyclic + 0.4 * s_modular)
    
    description = (
        f"{s_acyclic}% of modules/symbols are free from cyclic dependencies. "
        f"{s_modular}% of modules are free from coupling bottlenecks."
    )
    if len(bottlenecks) > 0:
        description += f" Identified {len(bottlenecks)} coupling bottleneck(s)."
        
    return score, description


def calculate_folder_balance(local_path: Path) -> float:
    """Calculate file distribution balance across folders using Shannon Entropy."""
    folder_counts = []
    for root, _, filenames in walk_tree(local_path):
        valid_files = [f for f in filenames if not f.startswith(".")]
        if valid_files:
            folder_counts.append(len(valid_files))
            
    if not folder_counts:
        return 1.0
        
    total_files = sum(folder_counts)
    if total_files == 0:
        return 1.0
        
    entropy = 0.0
    for count in folder_counts:
        p = count / total_files
        if p > 0:
            entropy -= p * math.log(p)
            
    num_folders = len(folder_counts)
    if num_folders <= 1:
        return 1.0
        
    max_entropy = math.log(num_folders)
    return entropy / max_entropy


def calculate_file_size_uniformity(local_path: Path) -> float:
    """Calculate file size uniformity using Gini Coefficient (1.0 - Gini)."""
    sizes = []
    for root, _, filenames in walk_tree(local_path):
        for filename in filenames:
            if filename.startswith("."):
                continue
            file_path = root / filename
            try:
                sizes.append(file_path.stat().st_size)
            except OSError:
                continue
    if not sizes:
        return 1.0
        
    n = len(sizes)
    if n == 0:
        return 1.0
        
    mean_size = sum(sizes) / n
    if mean_size == 0:
        return 1.0
        
    sizes_sorted = sorted(sizes)
    abs_diff_sum = 0
    for i, val in enumerate(sizes_sorted):
        abs_diff_sum += val * (2 * i - n + 1)
        
    gini = abs_diff_sum / (n * n * mean_size)
    return 1.0 - gini


def get_max_nesting_depth(local_path: Path) -> int:
    """Calculate max directory nesting depth."""
    max_depth = 0
    for root, _, _ in walk_tree(local_path):
        try:
            rel = root.relative_to(local_path)
            depth = len(rel.parts)
            if depth > max_depth:
                max_depth = depth
        except ValueError:
            continue
    return max_depth


def get_empty_folders_count(local_path: Path) -> int:
    """Count directories that have no files and no subdirectories."""
    empty_count = 0
    for root, dirnames, filenames in walk_tree(local_path):
        valid_files = [f for f in filenames if not f.startswith(".")]
        valid_subdirs = [d for d in dirnames if not d.startswith(".")]
        if len(valid_files) == 0 and len(valid_subdirs) == 0:
            empty_count += 1
    return empty_count


def compute_code_organization(local_path: Path) -> tuple[int, str]:
    """Compute folder structure balance and file size uniformity."""
    balance = calculate_folder_balance(local_path)
    uniformity = calculate_file_size_uniformity(local_path)
    max_depth = get_max_nesting_depth(local_path)
    empty_folders = get_empty_folders_count(local_path)

    s_balance = round(balance * 100)
    s_uniformity = round(uniformity * 100)

    # Threshold explanation: nesting depth > 5 represents excessive nested structures
    nesting_penalty = max(0, (max_depth - 5) * 5)
    nesting_penalty = min(nesting_penalty, 15)

    empty_penalty = min(empty_folders * 2, 10)

    score = max(0, round(0.5 * s_balance + 0.5 * s_uniformity - nesting_penalty - empty_penalty))

    description = (
        f"Folder structure balance is {s_balance}%. File size uniformity is {s_uniformity}%. "
        f"Max nesting depth is {max_depth} (penalty: -{nesting_penalty} pts)."
    )
    if empty_folders > 0:
        description += f" Found {empty_folders} empty folders (penalty: -{empty_penalty} pts)."

    return score, description


def get_doc_and_code_counts(local_path: Path) -> tuple[int, int, bool]:
    """Count documentation files and code files, and check root readme."""
    doc_extensions = {".md", ".txt", ".rst", ".adoc"}
    code_extensions = {
        ".py", ".js", ".jsx", ".ts", ".tsx", ".java", ".c", ".h",
        ".cpp", ".cc", ".cs", ".go", ".rs"
    }
    
    doc_count = 0
    code_count = 0
    readme_exists = False
    
    for root, _, filenames in walk_tree(local_path):
        for f in filenames:
            if f.startswith("."):
                continue
            path = root / f
            suffix = path.suffix.lower()
            if suffix in doc_extensions:
                doc_count += 1
            elif suffix in code_extensions:
                code_count += 1
                
            if root == local_path and f.lower().startswith("readme"):
                readme_exists = True
                
    return doc_count, code_count, readme_exists


def compute_documentation_coverage(local_path: Path, modules: list[dict]) -> tuple[int, str]:
    """Compute repository documentation metrics, combining agnostic and AST-level data."""
    doc_count, code_count, readme_exists = get_doc_and_code_counts(local_path)
    s_readme = 100 if readme_exists else 0

    # 1. Check if we have Python AST modules to evaluate inline documentation
    total_symbols = 0
    doc_symbols = 0
    for module in modules:
        total_symbols += 1
        if module.get("docstring"):
            doc_symbols += 1
            
        for cls in module.get("classes", []):
            total_symbols += 1
            if cls.get("docstring"):
                doc_symbols += 1
            for method in cls.get("methods", []):
                total_symbols += 1
                if method.get("docstring"):
                    doc_symbols += 1
                    
        for func in module.get("functions", []):
            total_symbols += 1
            if func.get("docstring"):
                doc_symbols += 1

    if total_symbols > 0:
        # Language-Specific AST Docstring coverage
        ast_coverage = doc_symbols / total_symbols
        s_ast = round(ast_coverage * 100)
        score = round(0.3 * s_readme + 0.7 * s_ast)
        description = (
            f"README present: {readme_exists}. "
            f"AST parsing resolved {total_symbols} code symbols; {s_ast}% contain docstrings."
        )
    else:
        # Language-Agnostic fallback
        doc_ratio = doc_count / max(1, code_count)
        # 10% docs-to-code ratio is considered excellent for a codebase (100 points)
        s_doc_ratio = min(100, round(doc_ratio * 1000))
        score = round(0.5 * s_readme + 0.5 * s_doc_ratio)
        description = (
            f"README present: {readme_exists}. "
            f"Documentation files to source code files ratio is {doc_count}:{code_count} ({s_doc_ratio}% score)."
        )

    return score, description


def compute_repository_health(
    local_path: Path,
    scan_result: dict,
    parse_result: dict,
    graph_result: dict,
    online_dependencies: bool = False,
) -> list[HealthIndicator]:
    """Calculate and return all health indicators for the repository."""
    indicators = []

    # 1. Architecture Complexity
    arch_score, arch_desc = compute_architecture_complexity(
        graph_result.get("nodes", []),
        graph_result.get("edges", [])
    )
    indicators.append(
        HealthIndicator(
            id="architecture",
            label="Architecture complexity",
            score=arch_score,
            status=get_status(arch_score),
            description=arch_desc
        )
    )

    # 2. Code Organization
    org_score, org_desc = compute_code_organization(local_path)
    indicators.append(
        HealthIndicator(
            id="organization",
            label="Code organization",
            score=org_score,
            status=get_status(org_score),
            description=org_desc
        )
    )

    # 3. Documentation Coverage
    doc_score, doc_desc = compute_documentation_coverage(local_path, parse_result.get("modules", []))
    indicators.append(
        HealthIndicator(
            id="documentation",
            label="Documentation coverage",
            score=doc_score,
            status=get_status(doc_score),
            description=doc_desc
        )
    )

    # 4. Dependency Freshness
    deps = detect_manifests(local_path)
    dep_score, dep_descs = score_dependency_freshness(deps, online=online_dependencies)
    dep_desc = " ".join(dep_descs)
    indicators.append(
        HealthIndicator(
            id="dependencies",
            label="Dependency freshness",
            score=dep_score,
            status=get_status(dep_score),
            description=dep_desc
        )
    )

    return indicators

"""
Dependency and manifest analysis service.
Parses requirements.txt, pyproject.toml, and package.json to score dependency freshness and constraints.
"""

import json
import re
import urllib.request
from pathlib import Path

from app.core.logging import get_logger

logger = get_logger(__name__)

# Simple cache for latest package versions to avoid redundant lookups.
# Key: (manager, package_name), Value: version_string
_VERSION_CACHE: dict[tuple[str, str], str] = {}


def detect_manifests(repo_path: Path) -> list[dict]:
    """Scan the repository for known dependency manifests and parse their contents."""
    dependencies = []
    
    # 1. Scan for requirements.txt
    req_path = repo_path / "requirements.txt"
    if req_path.is_file():
        dependencies.extend(parse_requirements_txt(req_path))
        
    # 2. Scan for pyproject.toml
    pyproject_path = repo_path / "pyproject.toml"
    if pyproject_path.is_file():
        dependencies.extend(parse_pyproject_toml(pyproject_path))
        
    # 3. Scan for package.json
    package_json_path = repo_path / "package.json"
    if package_json_path.is_file():
        dependencies.extend(parse_package_json(package_json_path))
        
    return dependencies


def parse_requirements_txt(file_path: Path) -> list[dict]:
    """Parse pip requirements.txt line by line."""
    dependencies = []
    try:
        content = file_path.read_text(encoding="utf-8")
        for line in content.splitlines():
            line = line.strip()
            if not line or line.startswith("#") or line.startswith("-"):
                continue
            # Split by environment markers
            line = line.split(";")[0].strip()
            # Match package name and constraint
            match = re.match(r"^([a-zA-Z0-9_\-\[\]]+)\s*(.*)$", line)
            if match:
                package = match.group(1).strip()
                constraint = match.group(2).strip()
                dependencies.append({
                    "name": package,
                    "constraint": constraint,
                    "manager": "pip",
                    "file": file_path.name
                })
    except Exception as e:
        logger.warning("Failed to parse requirements.txt at %s: %s", file_path, e)
    return dependencies


def parse_pyproject_toml(file_path: Path) -> list[dict]:
    """Parse PEP 508 / Poetry dependencies from pyproject.toml using standard tomllib."""
    import tomllib
    dependencies = []
    try:
        content = file_path.read_text(encoding="utf-8")
        data = tomllib.loads(content)
        
        # 1. Standard project dependencies (PEP 508)
        project = data.get("project", {})
        if isinstance(project, dict):
            deps = project.get("dependencies", [])
            if isinstance(deps, list):
                for dep in deps:
                    match = re.match(r"^([a-zA-Z0-9_\-\[\]]+)\s*(.*)$", dep.strip())
                    if match:
                        dependencies.append({
                            "name": match.group(1).strip(),
                            "constraint": match.group(2).strip(),
                            "manager": "pip",
                            "file": file_path.name
                        })
                        
        # 2. Poetry dependencies
        tool = data.get("tool", {})
        if isinstance(tool, dict):
            poetry = tool.get("poetry", {})
            if isinstance(poetry, dict):
                poetry_deps = poetry.get("dependencies", {})
                if isinstance(poetry_deps, dict):
                    for pkg, spec in poetry_deps.items():
                        if pkg.lower() == "python":
                            continue  # skip python target version
                        constraint = ""
                        if isinstance(spec, str):
                            constraint = spec
                        elif isinstance(spec, dict):
                            constraint = spec.get("version", "")
                        dependencies.append({
                            "name": pkg,
                            "constraint": constraint,
                            "manager": "poetry",
                            "file": file_path.name
                        })
    except Exception as e:
        logger.warning("Failed to parse pyproject.toml at %s: %s", file_path, e)
    return dependencies


def parse_package_json(file_path: Path) -> list[dict]:
    """Parse dependencies and devDependencies from package.json."""
    dependencies = []
    try:
        content = file_path.read_text(encoding="utf-8")
        data = json.loads(content)
        for key in ["dependencies", "devDependencies"]:
            deps = data.get(key, {})
            if isinstance(deps, dict):
                for pkg, constraint in deps.items():
                    dependencies.append({
                        "name": pkg,
                        "constraint": str(constraint),
                        "manager": "npm",
                        "file": file_path.name
                    })
    except Exception as e:
        logger.warning("Failed to parse package.json at %s: %s", file_path, e)
    return dependencies


def score_pinning_locally(constraint: str, manager: str) -> int:
    """
    Deterministically score dependency pinning style.
    Range Pinning (Best practice) -> 100
    Rigid Pinning (Predictable but locks dependencies) -> 85
    Unpinned/Wildcard (Lax, security and build risk) -> 40
    """
    constraint = constraint.strip()
    if not constraint or constraint == "*":
        return 40
        
    if manager in ("pip", "poetry"):
        # Pip missing operators implies unpinned
        if not any(op in constraint for op in ["==", ">=", "<=", "~=", "^", ">", "<", "!="]):
            return 40
            
    # Range constraints (reusable / flexible updates)
    if (constraint.startswith("^") or 
        constraint.startswith("~") or 
        constraint.startswith(">=") or 
        "," in constraint):
        return 100
        
    # Rigid constraint
    if constraint.startswith("=="):
        return 85
        
    # NPM exact semver (e.g. 1.2.3 or v1.2.3)
    if manager == "npm":
        if re.match(r"^v?\d+\.\d+\.\d+(-[a-zA-Z0-9.]+)?$", constraint):
            return 85
            
    return 80


def extract_version(constraint: str) -> str | None:
    """Extract standard semantic version string from a constraint prefix."""
    constraint = constraint.strip()
    match = re.search(r"(\d+\.\d+\.\d+)", constraint)
    if match:
        return match.group(1)
    match = re.search(r"(\d+\.\d+)", constraint)
    if match:
        return f"{match.group(1)}.0"
    return None


def parse_semver(version_str: str) -> list[int]:
    """Helper to convert semver string to integer list."""
    match = re.match(r"^v?(\d+)\.(\d+)\.(\d+)", version_str)
    if match:
        return [int(match.group(1)), int(match.group(2)), int(match.group(3))]
    return [0, 0, 0]


def compare_versions(declared: str, latest: str) -> int:
    """Compare declared vs latest to determine version distance penalty."""
    dec_parts = parse_semver(declared)
    lat_parts = parse_semver(latest)
    
    if dec_parts[0] < lat_parts[0]:
        return 50  # Major behind
    if dec_parts[0] == lat_parts[0]:
        if dec_parts[1] < lat_parts[1]:
            return 80  # Minor behind
        if dec_parts[1] == lat_parts[1]:
            if dec_parts[2] < lat_parts[2]:
                return 95  # Patch behind
    return 100


def fetch_latest_version(package_name: str, manager: str) -> str | None:
    """Extensible online lookup via PyPI or npm registries with a low timeout."""
    cache_key = (manager, package_name)
    if cache_key in _VERSION_CACHE:
        return _VERSION_CACHE[cache_key]
        
    url = ""
    if manager in ("pip", "poetry"):
        url = f"https://pypi.org/pypi/{package_name}/json"
    elif manager == "npm":
        safe_pkg = package_name.replace("/", "%2F")
        url = f"https://registry.npmjs.org/{safe_pkg}/latest"
    else:
        return None
        
    try:
        req = urllib.request.Request(
            url, 
            headers={"User-Agent": "CommitIt/1.0 (Repository Health System)"}
        )
        with urllib.request.urlopen(req, timeout=1.5) as response:
            data = json.loads(response.read().decode("utf-8"))
            version = None
            if manager in ("pip", "poetry"):
                version = data.get("info", {}).get("version")
            elif manager == "npm":
                version = data.get("version")
                
            if version:
                _VERSION_CACHE[cache_key] = version
                return version
    except Exception as e:
        logger.debug("Failed online fetch for %s: %s", package_name, e)
        
    return None


def score_dependency_freshness(dependencies: list[dict], online: bool = False) -> tuple[int, list[str]]:
    """Compute the final dependency freshness score and output descriptive reasons."""
    if not dependencies:
        return 100, ["No external dependencies detected."]
        
    scores = []
    explanations = []
    
    range_count = 0
    rigid_count = 0
    unpinned_count = 0
    outdated_major = 0
    outdated_minor = 0
    outdated_patch = 0
    up_to_date = 0
    lookup_failed = 0
    
    for dep in dependencies:
        name = dep["name"]
        constraint = dep["constraint"]
        manager = dep["manager"]
        
        local_score = score_pinning_locally(constraint, manager)
        if local_score == 100:
            range_count += 1
        elif local_score == 85:
            rigid_count += 1
        else:
            unpinned_count += 1
            
        score = local_score
        
        if online:
            latest = fetch_latest_version(name, manager)
            if latest:
                declared = extract_version(constraint)
                if declared:
                    compare_score = compare_versions(declared, latest)
                    score = compare_score
                    if score == 100:
                        up_to_date += 1
                    elif score == 95:
                        outdated_patch += 1
                    elif score == 80:
                        outdated_minor += 1
                    elif score == 50:
                        outdated_major += 1
                else:
                    lookup_failed += 1
            else:
                lookup_failed += 1
                
        scores.append(score)
        
    avg_score = round(sum(scores) / len(scores))
    
    if online:
        explanations.append(
            f"Evaluated {len(dependencies)} dependencies online. "
            f"{up_to_date} up-to-date, {outdated_patch} patch version(s) behind, "
            f"{outdated_minor} minor version(s) behind, {outdated_major} major version(s) behind."
        )
        if lookup_failed > 0:
            explanations.append(f"Could not resolve version for {lookup_failed} dependencies.")
    else:
        explanations.append(
            f"Evaluated {len(dependencies)} dependencies locally based on constraint pinning. "
            f"{range_count} range pinned (recommended), {rigid_count} rigidly pinned, {unpinned_count} unpinned/wildcard (high risk)."
        )
        
    return avg_score, explanations

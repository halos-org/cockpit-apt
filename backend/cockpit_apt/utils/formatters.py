"""
JSON formatting utilities for cockpit-apt-bridge.

Handles serialization of apt.Package objects and other Python objects to JSON
for output to stdout. All formatters produce dictionaries that are later
serialized to JSON by the CLI.

Formatting Functions:
    to_json(data) - Convert any JSON-serializable data to formatted JSON string
    format_package(pkg) - Format apt.Package for list views (compact)
    format_package_details(pkg) - Format apt.Package with full details
    format_dependency(dep_or) - Format dependency OR-group to list of dicts

Output Considerations:
    - All output uses UTF-8 encoding
    - Pretty-printed with 2-space indentation for human readability
    - Sort keys disabled to preserve logical field ordering
    - Missing/optional fields default to empty string or null
    - All sizes in bytes

Field Mappings:
    Package (list view):
        - name: Package name
        - summary: One-line description
        - version: Candidate version
        - installed: Boolean installation status
        - section: Debian section (e.g., "web", "python")

    Package (detail view):
        - All list view fields plus:
        - description: Full multi-paragraph description
        - installedVersion: Currently installed version (or null)
        - candidateVersion: Available version (or null)
        - priority: Package priority (optional, standard, important, required)
        - homepage: Project homepage URL
        - maintainer: Package maintainer name and email
        - size: Download size in bytes
        - installedSize: Disk space usage in bytes
        - dependencies: List of dependency objects
        - reverseDependencies: List of package names

    Dependency:
        - name: Package name
        - relation: Version relation (>=, <=, =, <<, >>, or empty)
        - version: Version constraint (or empty)
"""

import json
from typing import Any


def to_json(data: Any) -> str:
    """
    Convert data to JSON string with consistent formatting.

    Args:
        data: Data to serialize (dict, list, or JSON-serializable type)

    Returns:
        JSON string representation

    Raises:
        TypeError: If data is not JSON-serializable
    """
    return json.dumps(data, indent=2, ensure_ascii=False, sort_keys=False)


def format_package(pkg: Any) -> dict[str, Any]:
    """
    Format an apt.Package object as a dictionary for list views.

    Args:
        pkg: python-apt Package object

    Returns:
        Dictionary with basic package information
    """
    # Get candidate version (available for install)
    candidate = pkg.candidate
    if candidate:
        version = candidate.version
        section = candidate.section or "unknown"
    else:
        version = "unknown"
        section = "unknown"

    return {
        "name": pkg.name,
        "summary": candidate.summary if candidate else "",
        "version": version,
        "installed": pkg.is_installed,
        "section": section,
    }


def format_package_details(pkg: Any) -> dict[str, Any]:
    """
    Format an apt.Package object as a detailed dictionary.

    Includes all fields needed for the details view: description, dependencies,
    homepage, maintainer, sizes, etc.

    Args:
        pkg: python-apt Package object

    Returns:
        Dictionary with comprehensive package information
    """
    candidate = pkg.candidate
    installed_version = pkg.installed

    # Basic information
    result: dict[str, Any] = {
        "name": pkg.name,
        "summary": candidate.summary if candidate else "",
        "description": candidate.description if candidate else "",
        "section": candidate.section if candidate else "unknown",
        "installed": pkg.is_installed,
        "installedVersion": installed_version.version if installed_version else None,
        "candidateVersion": candidate.version if candidate else None,
    }

    # Optional fields from candidate version
    if candidate:
        result["priority"] = candidate.priority if hasattr(candidate, "priority") else "optional"
        result["homepage"] = candidate.homepage if candidate.homepage else ""
        result["maintainer"] = (
            candidate.record.get("Maintainer", "") if hasattr(candidate, "record") else ""
        )
        result["size"] = candidate.size if hasattr(candidate, "size") else 0
        result["installedSize"] = (
            candidate.installed_size if hasattr(candidate, "installed_size") else 0
        )
    else:
        result["priority"] = "optional"
        result["homepage"] = ""
        result["maintainer"] = ""
        result["size"] = 0
        result["installedSize"] = 0

    # Dependencies (will be populated by command handler)
    result["dependencies"] = []
    result["reverseDependencies"] = []

    return result


def format_dependency(dep_or: Any) -> list[dict[str, Any]]:
    """
    Format an apt dependency OR-group as a list of dependency objects.

    Dependencies in APT can have OR relationships (e.g., "vim | emacs").
    This function formats one OR-group.

    Args:
        dep_or: python-apt dependency OR-group object

    Returns:
        List of dependency dictionaries, one per option in the OR-group
    """
    dependencies = []

    for dep in dep_or:
        dep_dict = {
            "name": dep.name,
            "relation": dep.relation or "",
            "version": dep.version or "",
        }
        dependencies.append(dep_dict)

    return dependencies

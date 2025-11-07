"""
JSON formatting utilities for cockpit-apt-bridge.

Handles serialization of Python objects to JSON for output to stdout.
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
    Format an apt.Package object as a dictionary.

    Args:
        pkg: python-apt Package object

    Returns:
        Dictionary with package information
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

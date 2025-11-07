"""
Search command implementation.

Searches for packages matching a query string in package names and summaries.
"""

import sys
from typing import Any

from cockpit_apt_bridge.utils.errors import CacheError
from cockpit_apt_bridge.utils.formatters import format_package


def execute(query: str) -> list[dict[str, Any]]:
    """
    Search for packages matching the query.

    Args:
        query: Search query string (min 2 characters)

    Returns:
        List of package dictionaries matching the query (max 100 results)

    Raises:
        APTBridgeError: If search fails
    """
    # Validate query length
    if len(query) < 2:
        from cockpit_apt_bridge.utils.errors import APTBridgeError
        raise APTBridgeError(
            "Query must be at least 2 characters",
            code="INVALID_QUERY"
        )

    try:
        # Import apt here to allow testing without python-apt installed
        import apt  # type: ignore
    except ImportError:
        # For development on non-Debian systems, provide helpful error
        raise CacheError(
            "python-apt not available - must run on Debian/Ubuntu system",
            details="ImportError: No module named 'apt'"
        )

    try:
        # Open APT cache
        cache = apt.Cache()
    except Exception as e:
        raise CacheError(
            "Failed to open APT cache",
            details=str(e)
        )

    # Search for matching packages
    results: list[dict[str, Any]] = []
    query_lower = query.lower()

    try:
        for pkg in cache:
            # Check if query matches package name or summary
            name_match = query_lower in pkg.name.lower()

            summary_match = False
            if pkg.candidate and pkg.candidate.summary:
                summary_match = query_lower in pkg.candidate.summary.lower()

            if name_match or summary_match:
                results.append(format_package(pkg))

                # Limit results to 100
                if len(results) >= 100:
                    break

        # Sort results: name matches first, then summary matches
        def sort_key(p: dict[str, Any]) -> tuple[int, str]:
            # 0 if name matches (higher priority), 1 if only summary matches
            name_matches = query_lower in p["name"].lower()
            return (0 if name_matches else 1, p["name"])

        results.sort(key=sort_key)

    except Exception as e:
        raise CacheError(
            "Error during package search",
            details=str(e)
        )

    return results

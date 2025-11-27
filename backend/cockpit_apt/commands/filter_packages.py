"""
Package filter command implementation.

Filters packages with cascade filtering: repository → tab → search → limit.

Performance Considerations:
    This command iterates through the entire APT cache on every request.
    On systems with 10,000+ packages, this can take 100-500ms.

    Mitigations in place:
    - Result limiting (default 1000 packages)
    - Cascade filtering with early exits (skip non-matching packages quickly)
    - Simple in-memory operations (no disk I/O during filtering)

    Future optimizations if needed:
    - Package list caching with invalidation
    - Indexing frequently-searched fields
    - Lazy evaluation with generators

    Current performance is acceptable for typical usage patterns.
"""

from typing import Any

from cockpit_apt.utils.errors import CacheError
from cockpit_apt.utils.formatters import format_package
from cockpit_apt.utils.repository_parser import package_matches_repository


def execute(
    repository_id: str | None = None,
    tab: str | None = None,
    search_query: str | None = None,
    limit: int = 1000,
) -> dict[str, Any]:
    """
    Filter packages with cascade filtering.

    Filter order (cascade):
    1. Repository filter (if specified)
    2. Tab filter: "installed" or "upgradable" (if specified)
    3. Search query (if specified)
    4. Apply result limit

    Args:
        repository_id: Optional repository ID to filter by
        tab: Optional tab filter ("installed" or "upgradable")
        search_query: Optional search query to filter by
        limit: Maximum number of packages to return (default 1000)

    Returns:
        Dictionary with:
        - packages: List of package summaries
        - total_count: Total matching packages (before limit)
        - applied_filters: Description of active filters
        - limit: Result limit applied
        - limited: Whether results were truncated

    Raises:
        CacheError: If APT cache operations fail

    Note:
        Filters are applied in cascade order. Result is limited to prevent
        UI performance issues.
    """
    try:
        # Import apt here to allow testing without python-apt installed
        import apt  # type: ignore
    except ImportError:
        raise CacheError(
            "python-apt not available - must run on Debian/Ubuntu system",
            details="ImportError: No module named 'apt'",
        ) from None

    try:
        # Open APT cache
        cache = apt.Cache()
    except Exception as e:
        raise CacheError("Failed to open APT cache", details=str(e)) from e

    # Validate tab filter
    if tab and tab not in ("installed", "upgradable"):
        raise CacheError(
            f"Invalid tab filter: {tab}",
            "Tab must be 'installed' or 'upgradable'",
        )

    try:
        # Apply filters in cascade order
        matching_packages = []
        applied_filters = []

        for pkg in cache:
            # Skip packages without candidate version
            if not pkg.candidate:
                continue

            # Filter 1: Repository filter
            if repository_id and not package_matches_repository(pkg, repository_id):
                continue

            # Filter 2: Tab filter
            if tab == "installed" and not pkg.is_installed:
                continue
            if tab == "upgradable" and not pkg.is_upgradable:
                continue

            # Filter 3: Search query
            if search_query:
                query_lower = search_query.lower()
                name_match = query_lower in pkg.name.lower()
                summary_match = (
                    pkg.candidate.summary and query_lower in pkg.candidate.summary.lower()
                )
                if not (name_match or summary_match):
                    continue

            matching_packages.append(pkg)

        # Build filter description
        if repository_id:
            applied_filters.append(f"repository={repository_id}")
        if tab:
            applied_filters.append(f"tab={tab}")
        if search_query:
            applied_filters.append(f"search={search_query}")

        total_count = len(matching_packages)

        # Apply result limit
        limited_packages = matching_packages[:limit]

        # Convert to package summaries
        package_summaries = [format_package(pkg) for pkg in limited_packages]

        return {
            "packages": package_summaries,
            "total_count": total_count,
            "applied_filters": applied_filters,
            "limit": limit,
            "limited": total_count > limit,
        }

    except Exception as e:
        raise CacheError("Error filtering packages", details=str(e)) from e

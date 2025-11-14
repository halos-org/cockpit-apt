"""
Package filter command implementation.

Filters packages with cascade filtering: store → repository → tab → search.
"""

from typing import Any

from cockpit_apt_bridge.utils.errors import CacheError
from cockpit_apt_bridge.utils.formatters import format_package
from cockpit_apt_bridge.utils.repository_parser import package_matches_repository
from cockpit_apt_bridge.utils.store_config import load_stores
from cockpit_apt_bridge.utils.store_filter import matches_store_filter


def execute(
    store_id: str | None = None,
    repository_id: str | None = None,
    tab: str | None = None,
    search_query: str | None = None,
    limit: int = 1000,
) -> dict[str, Any]:
    """
    Filter packages with cascade filtering.

    Filter order (cascade):
    1. Store filter (if specified)
    2. Repository filter (if specified)
    3. Tab filter: "installed" or "upgradable" (if specified)
    4. Search query (if specified)

    Args:
        store_id: Optional store ID to filter by
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

    # Load store config if filtering by store
    store = None
    if store_id:
        stores = load_stores()
        store = next((s for s in stores if s.id == store_id), None)
        if not store:
            raise CacheError(
                f"Store not found: {store_id}",
                f"No store configuration found with id '{store_id}'",
            )

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

            # Filter 1: Store filter
            if store and not matches_store_filter(pkg, store):
                continue

            # Filter 2: Repository filter
            if repository_id and not package_matches_repository(pkg, repository_id):
                continue

            # Filter 3: Tab filter
            if tab == "installed" and not pkg.is_installed:
                continue
            if tab == "upgradable" and not pkg.is_upgradable:
                continue

            # Filter 4: Search query
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
        if store_id:
            applied_filters.append(f"store={store_id}")
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

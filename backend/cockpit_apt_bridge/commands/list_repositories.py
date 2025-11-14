"""
Repositories list command implementation.

Lists all repositories with optional store filtering.
"""

from typing import Any

from cockpit_apt_bridge.utils.errors import CacheError
from cockpit_apt_bridge.utils.repository_parser import parse_repositories
from cockpit_apt_bridge.utils.store_config import load_stores
from cockpit_apt_bridge.utils.store_filter import matches_store_filter


def execute(store_id: str | None = None) -> list[dict[str, Any]]:
    """
    List all repositories with optional store filtering.

    Args:
        store_id: Optional store ID to filter repositories

    Returns:
        List of repository dictionaries with:
        - id: Repository identifier (origin:suite)
        - name: Display name
        - origin: Repository origin
        - label: Repository label
        - suite: Repository suite
        - package_count: Number of packages from this repository

    Raises:
        CacheError: If APT cache operations fail

    Note:
        When store_id is specified, only repositories with packages matching
        the store's filters are included, and package counts reflect only
        matching packages.
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

    # Get store config if filtering by store
    store = None
    if store_id:
        stores = load_stores()
        store = next((s for s in stores if s.id == store_id), None)
        if not store:
            raise CacheError(
                f"Store not found: {store_id}",
                f"No store configuration found with id '{store_id}'",
            )

    try:
        # Parse repositories from cache
        repositories = parse_repositories(cache)

        # If store filter is active, recount packages per repository
        if store:
            # Build repo_id -> count mapping in single pass over packages
            repo_counts = {}
            for pkg in cache:
                if not pkg.candidate:
                    continue

                origins = pkg.candidate.origins
                if not origins:
                    continue

                origin_obj = origins[0]
                pkg_origin = getattr(origin_obj, "origin", "") or ""
                pkg_label = getattr(origin_obj, "label", "") or ""
                pkg_suite = getattr(origin_obj, "suite", "") or ""

                # Check if matches store filter first (cheaper)
                if not matches_store_filter(pkg, store):
                    continue

                # Find matching repository
                for repo in repositories:
                    repo_match = (pkg_origin or pkg_label) == (
                        repo.origin or repo.label
                    ) and pkg_suite == repo.suite

                    if repo_match:
                        repo_counts[repo.id] = repo_counts.get(repo.id, 0) + 1
                        break

            # Build result from repositories with counts
            result = []
            for repo in repositories:
                count = repo_counts.get(repo.id, 0)
                if count > 0:
                    result.append(
                        {
                            "id": repo.id,
                            "name": repo.name,
                            "origin": repo.origin,
                            "label": repo.label,
                            "suite": repo.suite,
                            "package_count": count,
                        }
                    )

            # Sort alphabetically by name
            result.sort(key=lambda r: str(r["name"]).lower())  # type: ignore[arg-type]
            return result

        else:
            # No store filter - return all repositories
            return [
                {
                    "id": repo.id,
                    "name": repo.name,
                    "origin": repo.origin,
                    "label": repo.label,
                    "suite": repo.suite,
                    "package_count": repo.package_count,
                }
                for repo in repositories
            ]

    except CacheError:
        raise
    except Exception as e:
        raise CacheError("Error listing repositories", details=str(e)) from e

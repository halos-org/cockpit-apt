"""
Repositories list command implementation.

Lists all APT repositories.
"""

from typing import Any

from cockpit_apt_bridge.utils.errors import CacheError
from cockpit_apt_bridge.utils.repository_parser import parse_repositories


def execute() -> list[dict[str, Any]]:
    """
    List all APT repositories.

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

    try:
        # Parse repositories from cache
        repositories = parse_repositories(cache)

        # Return all repositories
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

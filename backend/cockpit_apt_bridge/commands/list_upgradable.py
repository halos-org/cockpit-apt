"""
List-upgradable command implementation.

Lists all packages with available upgrades.
"""

from typing import Any

from cockpit_apt_bridge.utils.errors import CacheError


def execute() -> list[dict[str, Any]]:
    """
    List all packages with available upgrades.

    Returns:
        List of upgradable package dictionaries with name, installedVersion,
        candidateVersion, and summary, sorted alphabetically by package name

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
        )

    try:
        # Open APT cache
        cache = apt.Cache()
    except Exception as e:
        raise CacheError("Failed to open APT cache", details=str(e))

    try:
        # Call upgrade() to mark packages for upgrade
        # This doesn't actually upgrade anything, just marks what would be upgraded
        cache.upgrade()

        # Find upgradable packages
        packages = []

        for pkg in cache:
            if pkg.is_upgradable:
                installed_version = pkg.installed
                candidate = pkg.candidate

                package_dict = {
                    "name": pkg.name,
                    "installedVersion": installed_version.version
                    if installed_version
                    else "unknown",
                    "candidateVersion": candidate.version if candidate else "unknown",
                    "summary": candidate.summary if candidate else "",
                }
                packages.append(package_dict)

        # Sort alphabetically by name
        packages.sort(key=lambda p: p["name"])  # type: ignore[arg-type]

        return packages

    except Exception as e:
        raise CacheError("Error listing upgradable packages", details=str(e))

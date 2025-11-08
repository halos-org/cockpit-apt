"""
List-installed command implementation.

Lists all currently installed packages.
"""

from typing import Any

from cockpit_apt_bridge.utils.errors import CacheError


def execute() -> list[dict[str, Any]]:
    """
    List all installed packages.

    Returns:
        List of installed package dictionaries with name, version, summary, and section,
        sorted alphabetically by package name

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
        # Find installed packages
        packages = []

        for pkg in cache:
            if pkg.is_installed:
                # For installed packages, use the installed version
                installed_version = pkg.installed
                candidate = pkg.candidate

                package_dict = {
                    "name": pkg.name,
                    "version": installed_version.version if installed_version else "unknown",
                    "summary": installed_version.summary if installed_version else "",
                    "section": installed_version.section if installed_version else "unknown",
                }
                packages.append(package_dict)

        # Sort alphabetically by name
        packages.sort(key=lambda p: p["name"])

        return packages

    except Exception as e:
        raise CacheError("Error listing installed packages", details=str(e))

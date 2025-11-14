"""
Dependencies command implementation.

Gets direct dependencies of a package.
"""

from typing import Any

from cockpit_apt_bridge.utils.errors import CacheError, PackageNotFoundError
from cockpit_apt_bridge.utils.formatters import format_dependency
from cockpit_apt_bridge.utils.validators import validate_package_name


def execute(package_name: str) -> list[dict[str, Any]]:
    """
    Get direct dependencies of a package.

    Args:
        package_name: Name of the package to query

    Returns:
        List of dependency dictionaries with name, relation, and version fields.
        Returns empty list if package has no dependencies.

    Raises:
        APTBridgeError: If package name is invalid
        PackageNotFoundError: If package is not found
        CacheError: If APT cache operations fail
    """
    # Validate package name
    validate_package_name(package_name)

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
        # Look up package
        if package_name not in cache:
            raise PackageNotFoundError(package_name)

        pkg = cache[package_name]

        # Get dependencies from candidate version
        dependencies = []

        if pkg.candidate and hasattr(pkg.candidate, "dependencies"):
            for dep_or in pkg.candidate.dependencies:
                # Each dep_or is a list of alternative dependencies (OR relationship)
                dep_list = format_dependency(dep_or)
                dependencies.extend(dep_list)

        return dependencies

    except PackageNotFoundError:
        raise
    except Exception as e:
        raise CacheError(f"Error getting dependencies for '{package_name}'", details=str(e)) from e

"""
Reverse-dependencies command implementation.

Gets packages that depend on this package (reverse dependencies).
"""

from cockpit_apt_bridge.utils.errors import CacheError, PackageNotFoundError
from cockpit_apt_bridge.utils.validators import validate_package_name


def execute(package_name: str) -> list[str]:
    """
    Get packages that depend on this package.

    Args:
        package_name: Name of the package to query

    Returns:
        List of package names that depend on this package (max 50 results),
        sorted alphabetically

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
        # Verify package exists
        if package_name not in cache:
            raise PackageNotFoundError(package_name)

        # Find packages that depend on this one (limit to 50 for performance)
        reverse_deps = []
        count = 0

        for other_pkg in cache:
            if count >= 50:
                break

            # Check if other_pkg depends on our package
            if other_pkg.candidate and hasattr(other_pkg.candidate, "dependencies"):
                for dep_or in other_pkg.candidate.dependencies:
                    found = False
                    for dep in dep_or:
                        if dep.name == package_name:
                            reverse_deps.append(other_pkg.name)
                            count += 1
                            found = True
                            break
                    if found or count >= 50:
                        break

        # Sort alphabetically
        reverse_deps.sort()

        return reverse_deps

    except PackageNotFoundError:
        raise
    except Exception as e:
        raise CacheError(
            f"Error getting reverse dependencies for '{package_name}'", details=str(e)
        ) from e

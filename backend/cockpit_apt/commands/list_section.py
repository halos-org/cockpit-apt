"""
List-section command implementation.

Lists all packages in a specific Debian section.
"""

from typing import Any

from cockpit_apt.utils.errors import CacheError
from cockpit_apt.utils.formatters import format_package
from cockpit_apt.utils.validators import validate_section_name


def execute(section_name: str) -> list[dict[str, Any]]:
    """
    List all packages in a specific section.

    Args:
        section_name: Name of the section to query

    Returns:
        List of package dictionaries in the section,
        sorted alphabetically by package name.
        Returns empty list if section has no packages (not an error).

    Raises:
        APTBridgeError: If section name is invalid
        CacheError: If APT cache operations fail
    """
    # Validate section name
    validate_section_name(section_name)

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
        # Find packages in this section
        packages = []

        for pkg in cache:
            if pkg.candidate:
                pkg_section = pkg.candidate.section or "unknown"
                if pkg_section == section_name:
                    packages.append(format_package(pkg))

        # Sort alphabetically by name
        packages.sort(key=lambda p: p["name"])  # type: ignore[arg-type]

        return packages

    except Exception as e:
        raise CacheError(
            f"Error listing packages in section '{section_name}'", details=str(e)
        ) from e

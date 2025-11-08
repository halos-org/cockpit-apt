"""
Sections command implementation.

Lists all Debian sections with package counts.
"""

from typing import Any

from cockpit_apt_bridge.utils.errors import CacheError


def execute() -> list[dict[str, Any]]:
    """
    List all Debian sections with package counts.

    Returns:
        List of section dictionaries with name and count fields,
        sorted alphabetically by section name

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
        # Count packages per section
        section_counts: dict[str, int] = {}

        for pkg in cache:
            # Get section from candidate version
            if pkg.candidate:
                section = pkg.candidate.section or "unknown"
                section_counts[section] = section_counts.get(section, 0) + 1

        # Convert to list of dictionaries and sort
        sections = [
            {"name": name, "count": count}
            for name, count in section_counts.items()
            if count > 0  # Only include sections with at least one package
        ]

        sections.sort(key=lambda s: s["name"])

        return sections

    except Exception as e:
        raise CacheError("Error listing sections", details=str(e))

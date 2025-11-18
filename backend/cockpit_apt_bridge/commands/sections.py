"""
Sections command implementation.

Lists all Debian sections with package counts.
"""

from typing import Any

from cockpit_apt_bridge.utils.errors import APTBridgeError, CacheError
from cockpit_apt_bridge.utils.store_config import load_stores
from cockpit_apt_bridge.utils.store_filter import matches_store_filter


def execute(store_id: str | None = None) -> list[dict[str, Any]]:
    """
    List all Debian sections with package counts.

    Args:
        store_id: Optional store ID to filter packages. If None, uses all packages.

    Returns:
        List of section dictionaries with name and count fields,
        sorted alphabetically by section name

    Raises:
        APTBridgeError: If store_id is invalid
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
        # Load store configuration if store_id provided
        store_config = None

        if store_id:
            stores = load_stores()
            matching_stores = [s for s in stores if s.id == store_id]

            if not matching_stores:
                raise APTBridgeError(
                    f"Store '{store_id}' not found",
                    "STORE_NOT_FOUND",
                )

            store_config = matching_stores[0]

        # Count packages per section
        section_counts: dict[str, int] = {}

        for pkg in cache:
            # Apply store filter if configured
            if store_config and not matches_store_filter(pkg, store_config):
                continue

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

    except APTBridgeError:
        # Re-raise our own errors
        raise
    except Exception as e:
        raise CacheError("Error listing sections", details=str(e)) from e

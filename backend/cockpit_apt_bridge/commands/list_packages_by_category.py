"""
List-packages-by-category command implementation.

Lists all packages in a specific category (auto-discovered from category:: tags).
"""

from typing import Any

from cockpit_apt_bridge.utils.debtag_parser import has_tag_facet
from cockpit_apt_bridge.utils.errors import APTBridgeError, CacheError
from cockpit_apt_bridge.utils.formatters import format_package
from cockpit_apt_bridge.utils.store_config import load_stores
from cockpit_apt_bridge.utils.store_filter import matches_store_filter


def execute(category_id: str, store_id: str | None = None) -> list[dict[str, Any]]:
    """
    List all packages in a specific category.

    Packages are identified by category:: tags. Only packages matching
    the store filter (if provided) are included.

    Args:
        category_id: Category identifier (e.g., "navigation", "chartplotters")
        store_id: Optional store ID to filter packages. If None, uses all packages.

    Returns:
        List of package dictionaries in the category,
        sorted alphabetically by package name.
        Returns empty list if category has no packages (not an error).

    Raises:
        APTBridgeError: If category_id is empty or store_id is invalid
        CacheError: If APT cache operations fail
    """
    # Validate category ID
    if not category_id or not category_id.strip():
        raise APTBridgeError("Category ID cannot be empty", "INVALID_CATEGORY")

    category_id = category_id.strip()

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

        # Find packages in this category
        packages = []

        for pkg in cache:
            # Apply store filter if configured
            if store_config and not matches_store_filter(pkg, store_config):
                continue

            # Only include packages with candidate version
            if not pkg.candidate:
                continue

            # Check if package has the category tag
            if has_tag_facet(pkg, "category", category_id):
                packages.append(format_package(pkg))

        # Sort alphabetically by name
        packages.sort(key=lambda p: p["name"])

        return packages

    except APTBridgeError:
        # Re-raise our own errors
        raise
    except Exception as e:
        raise CacheError(
            f"Error listing packages in category '{category_id}'", details=str(e)
        ) from e

"""
Stores list command implementation.

Lists all available store configurations with metadata.
"""

from typing import Any

from cockpit_apt_bridge.utils.store_config import load_stores


def execute() -> list[dict[str, Any]]:
    """
    List all available store configurations.

    Returns:
        List of store dictionaries with metadata fields:
        - id: Store identifier
        - name: Display name
        - description: Store description
        - icon: Optional icon URL/path
        - banner: Optional banner image URL/path
        - filters: Filter configuration (origins, sections, tags, packages)
        - category_metadata: Optional category metadata

    Note:
        Returns empty list if no stores are configured (vanilla mode).
        Errors loading individual stores are logged but don't fail the command.
    """
    stores = load_stores()

    # Convert StoreConfig objects to JSON-serializable dictionaries
    result = []
    for store in stores:
        store_dict: dict[str, Any] = {
            "id": store.id,
            "name": store.name,
            "description": store.description,
            "icon": store.icon,
            "banner": store.banner,
            "filters": {
                "include_origins": store.filters.include_origins,
                "include_sections": store.filters.include_sections,
                "include_tags": store.filters.include_tags,
                "include_packages": store.filters.include_packages,
            },
        }

        # Include category metadata if present
        if store.category_metadata:
            store_dict["category_metadata"] = [
                {
                    "id": cm.id,
                    "label": cm.label,
                    "description": cm.description,
                    "icon": cm.icon,
                }
                for cm in store.category_metadata
            ]
        else:
            store_dict["category_metadata"] = None

        result.append(store_dict)

    return result

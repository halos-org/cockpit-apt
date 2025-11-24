"""Store configuration loading and validation.

This module handles loading YAML-based store configurations from the filesystem.
Store configurations define filters for creating curated package collections
(e.g., marine navigation apps, development tools).
"""

from __future__ import annotations

import logging
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import yaml

from .errors import APTBridgeError

logger = logging.getLogger(__name__)

STORE_CONFIG_DIR = Path("/etc/container-apps/stores")


@dataclass
class StoreFilter:
    """Filter criteria for a store."""

    include_origins: list[str]
    include_sections: list[str]
    include_tags: list[str]
    include_packages: list[str]

    def __post_init__(self) -> None:
        """Validate that at least one filter type is specified."""
        if not any(
            [
                self.include_origins,
                self.include_sections,
                self.include_tags,
                self.include_packages,
            ]
        ):
            raise ValueError("At least one filter type must be specified")


@dataclass
class CategoryMetadata:
    """Optional metadata for enhancing category display.

    Categories are auto-discovered from package category:: tags.
    This metadata provides optional enhancements for display purposes.
    """

    id: str  # category ID (e.g., "navigation")
    label: str  # Display name (e.g., "Navigation & Charts")
    icon: str | None = None  # PatternFly icon name OR file path
    description: str | None = None  # Category description


@dataclass
class StoreConfig:
    """Store configuration."""

    id: str
    name: str
    description: str
    filters: StoreFilter
    icon: str | None = None
    banner: str | None = None
    category_metadata: list[CategoryMetadata] | None = None

    def __post_init__(self) -> None:
        """Validate store ID format."""
        if not self.id or not self.id.replace("-", "").replace("_", "").isalnum():
            raise ValueError(f"Invalid store ID: {self.id}")


def _validate_store_dict(data: dict[str, Any], filepath: Path) -> None:
    """Validate required fields in store configuration.

    Args:
        data: Parsed YAML data
        filepath: Path to config file for error messages

    Raises:
        APTBridgeError: If required fields are missing
    """
    required_fields = ["id", "name", "description", "filters"]
    missing = [field for field in required_fields if field not in data]

    if missing:
        raise APTBridgeError(
            f"Store config {filepath.name} missing required fields: {', '.join(missing)}",
            "INVALID_STORE_CONFIG",
        )

    # Validate filters structure
    if not isinstance(data["filters"], dict):
        raise APTBridgeError(
            f"Store config {filepath.name}: filters must be a dictionary",
            "INVALID_STORE_CONFIG",
        )


def _parse_filters(filters_dict: dict[str, Any]) -> StoreFilter:
    """Parse filter configuration from dictionary.

    Args:
        filters_dict: Filter configuration dictionary

    Returns:
        StoreFilter object

    Raises:
        ValueError: If filter configuration is invalid
    """
    return StoreFilter(
        include_origins=filters_dict.get("include_origins", []),
        include_sections=filters_dict.get("include_sections", []),
        include_tags=filters_dict.get("include_tags", []),
        include_packages=filters_dict.get("include_packages", []),
    )


def _parse_category_metadata(
    metadata_list: list[dict[str, Any]] | None,
) -> list[CategoryMetadata] | None:
    """Parse category metadata for enhanced display.

    Args:
        metadata_list: List of category metadata dictionaries

    Returns:
        List of CategoryMetadata objects or None
    """
    if not metadata_list:
        return None

    category_metadata = []
    for meta_dict in metadata_list:
        if not all(k in meta_dict for k in ["id", "label"]):
            logger.warning(
                "Skipping invalid category metadata (missing required fields): %s",
                meta_dict,
            )
            continue

        category_metadata.append(
            CategoryMetadata(
                id=meta_dict["id"],
                label=meta_dict["label"],
                icon=meta_dict.get("icon"),
                description=meta_dict.get("description"),
            )
        )

    return category_metadata if category_metadata else None


def _load_store_config(filepath: Path) -> StoreConfig | None:
    """Load and parse a single store configuration file.

    Args:
        filepath: Path to YAML configuration file

    Returns:
        StoreConfig object or None if loading fails
    """
    try:
        with filepath.open() as f:
            data = yaml.safe_load(f)

        if not isinstance(data, dict):
            logger.warning("Store config %s: root element must be a dictionary", filepath.name)
            return None

        # Validate required fields
        _validate_store_dict(data, filepath)

        # Parse filters
        filters = _parse_filters(data["filters"])

        # Parse category metadata if present
        category_metadata = _parse_category_metadata(data.get("category_metadata"))

        return StoreConfig(
            id=data["id"],
            name=data["name"],
            description=data["description"],
            filters=filters,
            icon=data.get("icon"),
            banner=data.get("banner"),
            category_metadata=category_metadata,
        )

    except yaml.YAMLError as e:
        logger.warning("Failed to parse YAML in %s: %s", filepath.name, e)
        return None
    except (ValueError, APTBridgeError) as e:
        logger.warning("Invalid store config %s: %s", filepath.name, e)
        return None
    except OSError as e:
        logger.warning("Failed to read store config %s: %s", filepath.name, e)
        return None


def load_stores(config_dir: Path | None = None) -> list[StoreConfig]:
    """Load all store configurations from filesystem.

    Scans the store configuration directory for YAML files and loads
    valid store configurations. Invalid or malformed files are logged
    and skipped. Returns an empty list if the directory doesn't exist
    (vanilla mode).

    Args:
        config_dir: Optional override for config directory (for testing)

    Returns:
        List of StoreConfig objects (empty if no stores installed)
    """
    if config_dir is None:
        config_dir = STORE_CONFIG_DIR

    # Handle missing directory gracefully (vanilla mode)
    if not config_dir.exists():
        logger.debug("Store config directory %s does not exist (vanilla mode)", config_dir)
        return []

    if not config_dir.is_dir():
        logger.warning("Store config path %s is not a directory", config_dir)
        return []

    stores: list[StoreConfig] = []
    seen_ids: set[str] = set()

    # Scan for YAML files
    yaml_files = list(config_dir.glob("*.yaml")) + list(config_dir.glob("*.yml"))

    for filepath in sorted(yaml_files):  # Sort for deterministic order
        store = _load_store_config(filepath)
        if store is None:
            continue

        # Check for duplicate IDs
        if store.id in seen_ids:
            logger.warning("Duplicate store ID '%s' in %s, skipping", store.id, filepath.name)
            continue

        seen_ids.add(store.id)
        stores.append(store)
        logger.debug("Loaded store config: %s from %s", store.id, filepath.name)

    logger.info("Loaded %d store configuration(s)", len(stores))
    return stores

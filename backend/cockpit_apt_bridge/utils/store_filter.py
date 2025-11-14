"""Store filter matching logic.

This module implements the filter matching logic for store definitions.
It determines whether a package matches the filter criteria defined in a store configuration.
"""

from __future__ import annotations

import logging
from typing import TYPE_CHECKING

from .debtag_parser import parse_package_tags
from .repository_parser import get_package_repository

if TYPE_CHECKING:
    import apt

    from .store_config import StoreConfig

logger = logging.getLogger(__name__)


def matches_store_filter(package: apt.Package, store: StoreConfig) -> bool:
    """Check if a package matches the filter criteria of a store.

    Filter logic:
    - Multiple filter types are combined with OR logic
    - Multiple values within a filter type are combined with OR logic
    - Package matches if it satisfies ANY of the specified filter types

    Args:
        package: APT package object
        store: Store configuration with filter criteria

    Returns:
        True if package matches ANY of the store's filter criteria

    Example:
        >>> # Package from Hat Labs OR in net section
        >>> filter = StoreFilter(
        ...     include_origins=["Hat Labs"],
        ...     include_sections=["net"],
        ...     include_tags=[],
        ...     include_packages=[]
        ... )
        >>> matches = matches_store_filter(pkg, store)
    """
    filters = store.filters

    # Collect match results for each specified filter type
    matches = []

    if filters.include_origins:
        matches.append(_matches_origin_filter(package, filters.include_origins))

    if filters.include_sections:
        matches.append(_matches_section_filter(package, filters.include_sections))

    if filters.include_tags:
        matches.append(_matches_tags_filter(package, filters.include_tags))

    if filters.include_packages:
        matches.append(_matches_packages_filter(package, filters.include_packages))

    # Return True if ANY filter matched (OR logic between filter types)
    return any(matches)


def _matches_origin_filter(package: apt.Package, origins: list[str]) -> bool:
    """Check if package origin matches any of the specified origins.

    Args:
        package: APT package object
        origins: List of acceptable origin names

    Returns:
        True if package origin is in the list (OR logic)
    """
    repo = get_package_repository(package)
    if repo is None:
        return False

    # Match on origin (or label if origin is empty)
    package_origin = repo.origin if repo.origin else repo.label

    return package_origin in origins


def _matches_section_filter(package: apt.Package, sections: list[str]) -> bool:
    """Check if package section matches any of the specified sections.

    Args:
        package: APT package object
        sections: List of acceptable section names

    Returns:
        True if package section is in the list (OR logic)
    """
    try:
        if not hasattr(package, "candidate") or package.candidate is None:
            return False

        section = package.candidate.section
        if not section:
            return False

        return section in sections

    except (AttributeError, TypeError):
        logger.debug("Error getting section for package %s", package.name)
        return False


def _matches_tags_filter(package: apt.Package, tags: list[str]) -> bool:
    """Check if package has any of the specified tags.

    Args:
        package: APT package object
        tags: List of acceptable tag strings

    Returns:
        True if package has at least one matching tag (OR logic)
    """
    package_tags = parse_package_tags(package)

    if not package_tags:
        return False

    # OR logic: package needs at least one matching tag
    return any(tag in package_tags for tag in tags)


def _matches_packages_filter(package: apt.Package, packages: list[str]) -> bool:
    """Check if package name is in the explicit package list.

    Args:
        package: APT package object
        packages: List of explicit package names

    Returns:
        True if package name is in the list (OR logic)
    """
    return package.name in packages


def count_matching_packages(cache: apt.Cache, store: StoreConfig) -> int:
    """Count how many packages in the cache match the store's filters.

    Args:
        cache: APT cache object
        store: Store configuration with filter criteria

    Returns:
        Number of matching packages
    """
    count = 0
    for package in cache:
        if matches_store_filter(package, store):
            count += 1

    return count


def filter_packages(cache: apt.Cache, store: StoreConfig) -> list[apt.Package]:
    """Get all packages that match the store's filters.

    Args:
        cache: APT cache object
        store: Store configuration with filter criteria

    Returns:
        List of matching packages
    """
    matching = []
    for package in cache:
        if matches_store_filter(package, store):
            matching.append(package)

    logger.info(
        "Store '%s' matched %d packages out of %d total",
        store.id,
        len(matching),
        len(cache),
    )

    return matching

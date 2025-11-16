"""Debian package tag (debtag) parser.

This module handles extraction and parsing of Debian package tags from APT metadata.
Debtags provide structured metadata about packages using a faceted classification
system (e.g., "field::marine", "role::container-app").
"""

from __future__ import annotations

import logging
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    import apt

logger = logging.getLogger(__name__)


def parse_package_tags(package: apt.Package) -> list[str]:
    """Extract and parse tags from a Debian package.

    Tags are stored in the package's "Tag" field as a comma-separated list.
    This function extracts, cleans, and returns them as a list of strings.

    Args:
        package: APT package object

    Returns:
        List of tag strings (empty list if no tags present)

    Example:
        >>> tags = parse_package_tags(pkg)
        >>> tags
        ['field::marine', 'role::container-app', 'interface::web']
    """
    try:
        # Access the Tag field from package record
        if not hasattr(package, "candidate") or package.candidate is None:
            return []

        record = package.candidate.record
        if not record or "Tag" not in record:
            return []

        tag_string = record["Tag"]
        if not tag_string:
            return []

        # Split by comma and strip whitespace
        tags = [tag.strip() for tag in tag_string.split(",")]

        # Filter out empty strings
        tags = [tag for tag in tags if tag]

        return tags

    except (AttributeError, KeyError, TypeError) as e:
        logger.debug("Error parsing tags for package %s: %s", package.name, e)
        return []


def get_tag_facet(tag: str) -> tuple[str, str] | None:
    """Split a faceted tag into facet and value components.

    Debian tags follow the format "facet::value" where the facet
    categorizes the type of information (e.g., "field", "role").

    Args:
        tag: Tag string to parse

    Returns:
        Tuple of (facet, value) or None if tag is not faceted

    Example:
        >>> get_tag_facet("field::marine")
        ('field', 'marine')
        >>> get_tag_facet("non-faceted-tag")
        None
    """
    if "::" not in tag:
        return None

    parts = tag.split("::", 1)
    if len(parts) != 2:
        return None

    facet, value = parts
    if not facet or not value:
        return None

    return (facet, value)


def has_tag(package: apt.Package, tag: str) -> bool:
    """Check if a package has a specific tag.

    Args:
        package: APT package object
        tag: Tag string to check for (case-sensitive)

    Returns:
        True if package has the tag, False otherwise

    Example:
        >>> has_tag(pkg, "field::marine")
        True
    """
    tags = parse_package_tags(package)
    return tag in tags


def has_tag_facet(package: apt.Package, facet: str, value: str | None = None) -> bool:
    """Check if a package has a tag with the specified facet.

    Args:
        package: APT package object
        facet: Facet to check for (e.g., "field", "role")
        value: Optional specific value to check (e.g., "marine")

    Returns:
        True if package has matching tag, False otherwise

    Example:
        >>> has_tag_facet(pkg, "field", "marine")
        True
        >>> has_tag_facet(pkg, "field")  # Any field::* tag
        True
    """
    tags = parse_package_tags(package)

    for tag in tags:
        tag_parts = get_tag_facet(tag)
        if tag_parts is None:
            continue

        tag_facet, tag_value = tag_parts

        if tag_facet == facet and (value is None or tag_value == value):
            return True

    return False


def get_tags_by_facet(package: apt.Package, facet: str) -> list[str]:
    """Get all tag values for a specific facet.

    Args:
        package: APT package object
        facet: Facet to filter by (e.g., "field", "role")

    Returns:
        List of values for the specified facet

    Example:
        >>> get_tags_by_facet(pkg, "field")
        ['marine', 'navigation']
    """
    tags = parse_package_tags(package)
    values = []

    for tag in tags:
        tag_parts = get_tag_facet(tag)
        if tag_parts is None:
            continue

        tag_facet, tag_value = tag_parts
        if tag_facet == facet:
            values.append(tag_value)

    return values


def derive_category_label(category_id: str) -> str:
    """Derive a human-readable label from a category ID.

    Converts category IDs like "navigation" or "chart-plotters" to
    title-cased labels like "Navigation" or "Chart Plotters".

    Args:
        category_id: Category identifier (e.g., "navigation", "chart-plotters")

    Returns:
        Human-readable label

    Example:
        >>> derive_category_label("navigation")
        'Navigation'
        >>> derive_category_label("chart-plotters")
        'Chart Plotters'
    """
    # Replace hyphens and underscores with spaces
    label = category_id.replace("-", " ").replace("_", " ")

    # Title case the result
    return label.title()

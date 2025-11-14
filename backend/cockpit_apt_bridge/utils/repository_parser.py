"""Repository metadata parser.

This module handles extraction of repository origin and label information from APT.
Repositories are identified by their Origin, Label, and Suite fields.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    import apt

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class Repository:
    """Repository information."""

    id: str  # Composite key: origin/label + suite
    name: str  # Display name (origin or label)
    origin: str
    label: str
    suite: str
    package_count: int

    def __hash__(self) -> int:
        """Hash based on composite key (origin, suite)."""
        return hash((self.origin or self.label, self.suite))

    def __eq__(self, other: object) -> bool:
        """Equality based on composite key (origin, suite)."""
        if not isinstance(other, Repository):
            return NotImplemented
        return (self.origin or self.label, self.suite) == (
            other.origin or other.label,
            other.suite,
        )


def _get_origin_info(package: apt.Package) -> tuple[str, str, str] | None:
    """Extract origin, label, and suite from package.

    Args:
        package: APT package object

    Returns:
        Tuple of (origin, label, suite) or None if not available
    """
    try:
        if not hasattr(package, "candidate") or package.candidate is None:
            return None

        origins = package.candidate.origins
        if not origins:
            return None

        # Use the first origin (typically the primary source)
        origin_obj = origins[0]

        origin = getattr(origin_obj, "origin", "") or ""
        label = getattr(origin_obj, "label", "") or ""
        suite = getattr(origin_obj, "suite", "") or ""

        # Must have at least origin or label, and a suite
        if (not origin and not label) or not suite:
            return None

        return (origin, label, suite)

    except (AttributeError, IndexError, TypeError) as e:
        logger.debug("Error getting origin info for package %s: %s", package.name, e)
        return None


def parse_repositories(cache: apt.Cache) -> list[Repository]:
    """Extract unique repositories from APT cache.

    Scans all packages in the cache and collects unique repository information
    based on origin and suite combination. Prefers Origin over Label for
    display names.

    Args:
        cache: APT cache object

    Returns:
        List of Repository objects, sorted alphabetically by name
    """
    # Use dict to deduplicate by (origin, suite) key
    from typing import Any

    repos: dict[tuple[str, str], dict[str, Any]] = {}

    for package in cache:
        origin_info = _get_origin_info(package)
        if origin_info is None:
            continue

        origin, label, suite = origin_info

        # Create composite key for deduplication
        key = (origin or label, suite)

        if key not in repos:
            # Prefer origin over label for display name
            display_name = origin if origin else label

            repos[key] = {
                "id": f"{key[0]}:{suite}",
                "name": display_name,
                "origin": origin,
                "label": label,
                "suite": suite,
                "packages": set(),
            }

        # Track which packages come from this repo
        repos[key]["packages"].add(package.name)

    # Convert to Repository objects with package counts
    result = []
    for repo_data in repos.values():
        result.append(
            Repository(
                id=repo_data["id"],
                name=repo_data["name"],
                origin=repo_data["origin"],
                label=repo_data["label"],
                suite=repo_data["suite"],
                package_count=len(repo_data["packages"]),
            )
        )

    # Sort alphabetically by name
    result.sort(key=lambda r: r.name.lower())  # type: ignore[arg-type]

    logger.info("Found %d unique repositories", len(result))
    return result


def get_package_repository(package: apt.Package) -> Repository | None:
    """Get the repository information for a specific package.

    Args:
        package: APT package object

    Returns:
        Repository object or None if repository info not available
    """
    origin_info = _get_origin_info(package)
    if origin_info is None:
        return None

    origin, label, suite = origin_info
    display_name = origin if origin else label
    repo_id = f"{origin or label}:{suite}"

    return Repository(
        id=repo_id,
        name=display_name,
        origin=origin,
        label=label,
        suite=suite,
        package_count=1,  # Single package query
    )


def package_matches_repository(package: apt.Package, repository_id: str) -> bool:
    """Check if a package belongs to a specific repository.

    Args:
        package: APT package object
        repository_id: Repository ID in format "{origin}:{suite}"

    Returns:
        True if package is from the specified repository
    """
    repo = get_package_repository(package)
    return repo is not None and repo.id == repository_id

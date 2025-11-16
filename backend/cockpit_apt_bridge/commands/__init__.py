"""
Command implementations for cockpit-apt-bridge.

Each command module implements an execute() function that performs the
command logic and returns the result.
"""

# Import all command modules for easy access
from cockpit_apt_bridge.commands import (
    dependencies,
    details,
    files,
    filter_packages,
    install,
    list_categories,
    list_installed,
    list_packages_by_category,
    list_repositories,
    list_section,
    list_stores,
    list_upgradable,
    remove,
    reverse_dependencies,
    search,
    sections,
    update,
)

__all__ = [
    "search",
    "details",
    "sections",
    "list_section",
    "list_categories",
    "list_packages_by_category",
    "list_installed",
    "list_upgradable",
    "list_stores",
    "list_repositories",
    "filter_packages",
    "dependencies",
    "reverse_dependencies",
    "files",
    "install",
    "remove",
    "update",
]

"""
Command implementations for cockpit-apt-bridge.

Each command module implements an execute() function that performs the
command logic and returns the result.
"""

# Import all command modules for easy access
from cockpit_apt.commands import (
    dependencies,
    details,
    files,
    install,
    list_installed,
    list_repositories,
    list_section,
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
    "list_installed",
    "list_upgradable",
    "list_repositories",
    "dependencies",
    "reverse_dependencies",
    "files",
    "install",
    "remove",
    "update",
]

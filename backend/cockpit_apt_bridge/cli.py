"""
Command-line interface for cockpit-apt-bridge.

This module provides the main entry point for the cockpit-apt-bridge CLI tool.
It parses command-line arguments and dispatches to appropriate command handlers,
handling errors and formatting output as JSON.

Commands:
    search QUERY                      - Search for packages matching QUERY
    details PACKAGE                   - Get detailed information about a package
    sections                          - List all Debian sections with package counts
    list-section SECTION              - List all packages in a section
    list-installed                    - List all installed packages
    list-upgradable                   - List packages with available upgrades
    dependencies PACKAGE              - Get direct dependencies of a package
    reverse-dependencies PACKAGE      - Get packages that depend on a package

Exit Codes:
    0 - Success
    1 - Expected error (validation, package not found, etc.)
    2 - Unexpected error

Output Format:
    - Success: JSON to stdout, exit 0
    - Error: JSON error to stderr, exit non-zero

Example Usage:
    $ cockpit-apt-bridge search nginx
    $ cockpit-apt-bridge details nginx
    $ cockpit-apt-bridge list-section web
"""

import sys
from typing import NoReturn

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
from cockpit_apt_bridge.utils.errors import APTBridgeError, format_error
from cockpit_apt_bridge.utils.formatters import to_json


def print_usage() -> None:
    """Print usage information to stderr."""
    usage = """
Usage: cockpit-apt-bridge <command> [arguments]

Commands:
  search QUERY                      Search for packages matching QUERY
  details PACKAGE                   Get detailed information about a package
  sections                          List all Debian sections with package counts
  list-section SECTION              List all packages in a section
  list-categories [--store ID]      List all categories (auto-discovered from tags)
  list-packages-by-category CATEGORY [--store ID]
                                    List all packages in a category
  list-installed                    List all installed packages
  list-upgradable                   List packages with available upgrades
  list-stores                       List all configured stores
  list-repositories [--store ID]    List all repositories (optionally filtered by store)
  filter-packages [OPTIONS]         Filter packages by store, repo, tab, search query, limit
                                    OPTIONS: [--store ID] [--repo ID] [--tab TAB]
                                             [--search QUERY] [--limit N]
  dependencies PACKAGE              Get direct dependencies of a package
  reverse-dependencies PACKAGE      Get packages that depend on a package
  files PACKAGE                     List files installed by a package (installed only)
  install PACKAGE                   Install a package (with progress)
  remove PACKAGE                    Remove a package (with progress)
  update                            Update package lists (with progress)

Examples:
  cockpit-apt-bridge search nginx
  cockpit-apt-bridge details nginx
  cockpit-apt-bridge sections
  cockpit-apt-bridge list-section web
  cockpit-apt-bridge list-categories --store marine
  cockpit-apt-bridge list-packages-by-category navigation --store marine
  cockpit-apt-bridge list-installed
  cockpit-apt-bridge list-upgradable
  cockpit-apt-bridge list-stores
  cockpit-apt-bridge list-repositories --store marine
  cockpit-apt-bridge filter-packages --store marine --tab installed --limit 50
  cockpit-apt-bridge dependencies nginx
  cockpit-apt-bridge reverse-dependencies libc6
  cockpit-apt-bridge files nginx
  cockpit-apt-bridge install cowsay
  cockpit-apt-bridge remove cowsay
  cockpit-apt-bridge update
"""
    print(usage, file=sys.stderr)


def main() -> NoReturn:
    """
    Main entry point for the CLI.

    Parses arguments, dispatches to command handler, and outputs JSON.
    Exits with code 0 on success, non-zero on error.
    """
    try:
        # Parse command-line arguments
        if len(sys.argv) < 2:
            print_usage()
            sys.exit(1)

        command = sys.argv[1]

        # Dispatch to command handler
        if command == "search":
            if len(sys.argv) < 3:
                raise APTBridgeError(
                    "Search command requires a query argument", code="INVALID_ARGUMENTS"
                )
            query = sys.argv[2]
            result = search.execute(query)

        elif command == "details":
            if len(sys.argv) < 3:
                raise APTBridgeError(
                    "Details command requires a package name argument", code="INVALID_ARGUMENTS"
                )
            package_name = sys.argv[2]
            result = details.execute(package_name)

        elif command == "sections":
            result = sections.execute()

        elif command == "list-section":
            if len(sys.argv) < 3:
                raise APTBridgeError(
                    "List-section command requires a section name argument",
                    code="INVALID_ARGUMENTS",
                )
            section_name = sys.argv[2]
            result = list_section.execute(section_name)

        elif command == "list-categories":
            # Optional --store parameter
            store_id = None
            if len(sys.argv) > 2:
                if sys.argv[2] == "--store":
                    if len(sys.argv) < 4:
                        raise APTBridgeError(
                            "List-categories --store requires a store ID",
                            code="INVALID_ARGUMENTS",
                        )
                    store_id = sys.argv[3]
                    if len(sys.argv) > 4:
                        raise APTBridgeError(
                            f"Unexpected argument: {sys.argv[4]}",
                            code="INVALID_ARGUMENTS",
                        )
                else:
                    raise APTBridgeError(
                        f"Unknown parameter: {sys.argv[2]}",
                        code="INVALID_ARGUMENTS",
                    )
            result = list_categories.execute(store_id)

        elif command == "list-packages-by-category":
            if len(sys.argv) < 3:
                raise APTBridgeError(
                    "List-packages-by-category command requires a category ID argument",
                    code="INVALID_ARGUMENTS",
                )
            category_id = sys.argv[2]
            # Optional --store parameter
            store_id = None
            if len(sys.argv) > 3:
                if sys.argv[3] == "--store":
                    if len(sys.argv) < 5:
                        raise APTBridgeError(
                            "List-packages-by-category --store requires a store ID",
                            code="INVALID_ARGUMENTS",
                        )
                    store_id = sys.argv[4]
                    if len(sys.argv) > 5:
                        raise APTBridgeError(
                            f"Unexpected argument: {sys.argv[5]}",
                            code="INVALID_ARGUMENTS",
                        )
                else:
                    raise APTBridgeError(
                        f"Unknown parameter: {sys.argv[3]}",
                        code="INVALID_ARGUMENTS",
                    )
            result = list_packages_by_category.execute(category_id, store_id)

        elif command == "list-installed":
            result = list_installed.execute()

        elif command == "list-upgradable":
            result = list_upgradable.execute()

        elif command == "list-stores":
            result = list_stores.execute()

        elif command == "list-repositories":
            # Optional --store parameter
            store_id = None
            if len(sys.argv) > 2:
                if sys.argv[2] == "--store":
                    if len(sys.argv) < 4:
                        raise APTBridgeError(
                            "List-repositories --store requires a store ID",
                            code="INVALID_ARGUMENTS",
                        )
                    store_id = sys.argv[3]
                    if len(sys.argv) > 4:
                        raise APTBridgeError(
                            f"Unexpected argument: {sys.argv[4]}",
                            code="INVALID_ARGUMENTS",
                        )
                else:
                    raise APTBridgeError(
                        f"Unknown parameter: {sys.argv[2]}",
                        code="INVALID_ARGUMENTS",
                    )
            result = list_repositories.execute(store_id)

        elif command == "filter-packages":
            # Parse optional parameters from command line
            # Format: filter-packages [--store ID] [--repo ID] [--tab TAB]
            #         [--search QUERY] [--limit N]
            store_id = None
            repository_id = None
            tab = None
            search_query = None
            limit = 1000

            i = 2
            while i < len(sys.argv):
                if sys.argv[i] == "--store":
                    if i + 1 >= len(sys.argv):
                        raise APTBridgeError(
                            "--store requires a value",
                            code="INVALID_ARGUMENTS",
                        )
                    store_id = sys.argv[i + 1]
                    i += 2
                elif sys.argv[i] == "--repo":
                    if i + 1 >= len(sys.argv):
                        raise APTBridgeError(
                            "--repo requires a value",
                            code="INVALID_ARGUMENTS",
                        )
                    repository_id = sys.argv[i + 1]
                    i += 2
                elif sys.argv[i] == "--tab":
                    if i + 1 >= len(sys.argv):
                        raise APTBridgeError(
                            "--tab requires a value",
                            code="INVALID_ARGUMENTS",
                        )
                    tab = sys.argv[i + 1]
                    i += 2
                elif sys.argv[i] == "--search":
                    if i + 1 >= len(sys.argv):
                        raise APTBridgeError(
                            "--search requires a value",
                            code="INVALID_ARGUMENTS",
                        )
                    search_query = sys.argv[i + 1]
                    i += 2
                elif sys.argv[i] == "--limit":
                    if i + 1 >= len(sys.argv):
                        raise APTBridgeError(
                            "--limit requires a value",
                            code="INVALID_ARGUMENTS",
                        )
                    try:
                        limit = int(sys.argv[i + 1])
                        if limit < 0:
                            raise APTBridgeError(
                                "--limit must be non-negative",
                                code="INVALID_ARGUMENTS",
                            )
                    except ValueError:
                        raise APTBridgeError(
                            f"Invalid limit value: {sys.argv[i + 1]}",
                            code="INVALID_ARGUMENTS",
                        ) from None
                    i += 2
                else:
                    raise APTBridgeError(
                        f"Unknown filter-packages parameter: {sys.argv[i]}",
                        code="INVALID_ARGUMENTS",
                    )

            result = filter_packages.execute(
                store_id=store_id,
                repository_id=repository_id,
                tab=tab,
                search_query=search_query,
                limit=limit,
            )

        elif command == "dependencies":
            if len(sys.argv) < 3:
                raise APTBridgeError(
                    "Dependencies command requires a package name argument",
                    code="INVALID_ARGUMENTS",
                )
            package_name = sys.argv[2]
            result = dependencies.execute(package_name)

        elif command == "reverse-dependencies":
            if len(sys.argv) < 3:
                raise APTBridgeError(
                    "Reverse-dependencies command requires a package name argument",
                    code="INVALID_ARGUMENTS",
                )
            package_name = sys.argv[2]
            result = reverse_dependencies.execute(package_name)

        elif command == "files":
            if len(sys.argv) < 3:
                raise APTBridgeError(
                    "Files command requires a package name argument", code="INVALID_ARGUMENTS"
                )
            package_name = sys.argv[2]
            result = files.execute(package_name)

        elif command == "install":
            if len(sys.argv) < 3:
                raise APTBridgeError(
                    "Install command requires a package name argument", code="INVALID_ARGUMENTS"
                )
            package_name = sys.argv[2]
            result = install.execute(package_name)

        elif command == "remove":
            if len(sys.argv) < 3:
                raise APTBridgeError(
                    "Remove command requires a package name argument", code="INVALID_ARGUMENTS"
                )
            package_name = sys.argv[2]
            result = remove.execute(package_name)

        elif command == "update":
            result = update.execute()

        elif command in ("--help", "-h", "help"):
            print_usage()
            sys.exit(0)

        else:
            raise APTBridgeError(f"Unknown command: {command}", code="UNKNOWN_COMMAND")

        # Output result as JSON to stdout (if not None)
        # Commands that stream progress may print results themselves and return None
        if result is not None:
            print(to_json(result))
        sys.exit(0)

    except APTBridgeError as e:
        # Expected errors - output formatted error to stderr
        print(format_error(e), file=sys.stderr)
        sys.exit(1)

    except Exception as e:
        # Unexpected errors - output generic error to stderr
        error = APTBridgeError(
            f"Unexpected error: {str(e)}", code="INTERNAL_ERROR", details=type(e).__name__
        )
        print(format_error(error), file=sys.stderr)
        sys.exit(2)

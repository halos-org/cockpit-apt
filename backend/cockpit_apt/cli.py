"""
Command-line interface for cockpit-apt-bridge.

This module provides the main entry point for the cockpit-apt-bridge CLI tool.
It parses command-line arguments and dispatches to appropriate command handlers,
handling errors and formatting output as JSON.

Commands:
    search QUERY                      - Search for packages matching QUERY
    details PACKAGE                   - Get detailed information about a package
    sections [--store ID]             - List all Debian sections with package counts
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

import argparse
import sys
from typing import NoReturn

from cockpit_apt.commands import (
    dependencies,
    details,
    files,
    filter_packages,
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
from cockpit_apt.utils.errors import APTBridgeError, format_error
from cockpit_apt.utils.formatters import to_json


def print_usage() -> None:
    """Print usage information to stderr."""
    usage = """
Usage: cockpit-apt-bridge <command> [arguments]

Commands:
  search QUERY                      Search for packages matching QUERY
  details PACKAGE                   Get detailed information about a package
  sections                          List all Debian sections with package counts
  list-section SECTION              List all packages in a section
  list-installed                    List all installed packages
  list-upgradable                   List packages with available upgrades
  list-repositories                 List all APT repositories
  filter-packages [OPTIONS]         Filter packages by repo, tab, search, limit
                                    OPTIONS: [--repo ID] [--tab TAB] [--search QUERY] [--limit N]
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
  cockpit-apt-bridge list-installed
  cockpit-apt-bridge list-upgradable
  cockpit-apt-bridge list-repositories
  cockpit-apt-bridge filter-packages --tab installed --search nginx
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

        elif command == "list-installed":
            result = list_installed.execute()

        elif command == "list-upgradable":
            result = list_upgradable.execute()

        elif command == "list-repositories":
            result = list_repositories.execute()

        elif command == "filter-packages":
            # Parse filter-packages arguments using argparse
            parser = argparse.ArgumentParser(
                prog="cockpit-apt-bridge filter-packages",
                description="Filter packages by repository, tab, search query, and limit",
                add_help=False,  # Don't add -h/--help (breaks JSON output)
            )
            parser.add_argument("--repo", dest="repository_id", help="Repository ID to filter by")
            parser.add_argument(
                "--tab",
                choices=["installed", "upgradable"],
                help="Tab filter (installed or upgradable)",
            )
            parser.add_argument("--search", dest="search_query", help="Search query")
            parser.add_argument(
                "--limit", type=int, default=1000, help="Maximum number of results (default: 1000)"
            )

            try:
                args = parser.parse_args(sys.argv[2:])
            except SystemExit:
                # argparse calls sys.exit on error - catch and convert to our error
                raise APTBridgeError(
                    "Invalid filter-packages arguments. Use: [--repo ID] [--tab TAB] [--search QUERY] [--limit N]",
                    code="INVALID_ARGUMENTS",
                ) from None

            result = filter_packages.execute(
                repository_id=args.repository_id,
                tab=args.tab,
                search_query=args.search_query,
                limit=args.limit,
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

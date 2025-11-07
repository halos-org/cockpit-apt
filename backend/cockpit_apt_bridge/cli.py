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
    search,
    details,
    sections,
    list_section,
    list_installed,
    list_upgradable,
    dependencies,
    reverse_dependencies,
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
  list-installed                    List all installed packages
  list-upgradable                   List packages with available upgrades
  dependencies PACKAGE              Get direct dependencies of a package
  reverse-dependencies PACKAGE      Get packages that depend on a package

Examples:
  cockpit-apt-bridge search nginx
  cockpit-apt-bridge details nginx
  cockpit-apt-bridge sections
  cockpit-apt-bridge list-section web
  cockpit-apt-bridge list-installed
  cockpit-apt-bridge list-upgradable
  cockpit-apt-bridge dependencies nginx
  cockpit-apt-bridge reverse-dependencies libc6
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
                    "Search command requires a query argument",
                    code="INVALID_ARGUMENTS"
                )
            query = sys.argv[2]
            result = search.execute(query)

        elif command == "details":
            if len(sys.argv) < 3:
                raise APTBridgeError(
                    "Details command requires a package name argument",
                    code="INVALID_ARGUMENTS"
                )
            package_name = sys.argv[2]
            result = details.execute(package_name)

        elif command == "sections":
            result = sections.execute()

        elif command == "list-section":
            if len(sys.argv) < 3:
                raise APTBridgeError(
                    "List-section command requires a section name argument",
                    code="INVALID_ARGUMENTS"
                )
            section_name = sys.argv[2]
            result = list_section.execute(section_name)

        elif command == "list-installed":
            result = list_installed.execute()

        elif command == "list-upgradable":
            result = list_upgradable.execute()

        elif command == "dependencies":
            if len(sys.argv) < 3:
                raise APTBridgeError(
                    "Dependencies command requires a package name argument",
                    code="INVALID_ARGUMENTS"
                )
            package_name = sys.argv[2]
            result = dependencies.execute(package_name)

        elif command == "reverse-dependencies":
            if len(sys.argv) < 3:
                raise APTBridgeError(
                    "Reverse-dependencies command requires a package name argument",
                    code="INVALID_ARGUMENTS"
                )
            package_name = sys.argv[2]
            result = reverse_dependencies.execute(package_name)

        elif command in ("--help", "-h", "help"):
            print_usage()
            sys.exit(0)

        else:
            raise APTBridgeError(
                f"Unknown command: {command}",
                code="UNKNOWN_COMMAND"
            )

        # Output result as JSON to stdout
        print(to_json(result))
        sys.exit(0)

    except APTBridgeError as e:
        # Expected errors - output formatted error to stderr
        print(format_error(e), file=sys.stderr)
        sys.exit(1)

    except Exception as e:
        # Unexpected errors - output generic error to stderr
        error = APTBridgeError(
            f"Unexpected error: {str(e)}",
            code="INTERNAL_ERROR",
            details=type(e).__name__
        )
        print(format_error(error), file=sys.stderr)
        sys.exit(2)

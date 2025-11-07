"""
Command-line interface for cockpit-apt-bridge.

Parses command-line arguments and dispatches to appropriate command handlers.
"""

import sys
from typing import NoReturn

from cockpit_apt_bridge.commands import search
from cockpit_apt_bridge.utils.errors import APTBridgeError, format_error
from cockpit_apt_bridge.utils.formatters import to_json


def print_usage() -> None:
    """Print usage information to stderr."""
    usage = """
Usage: cockpit-apt-bridge <command> [arguments]

Commands:
  search QUERY        Search for packages matching QUERY

Examples:
  cockpit-apt-bridge search nginx
  python -m cockpit_apt_bridge search web
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

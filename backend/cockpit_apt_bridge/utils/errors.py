"""
Error handling for cockpit-apt-bridge.

Defines custom exception classes and error formatting utilities for consistent
error reporting. All errors are formatted as JSON and output to stderr.

Exception Hierarchy:
    APTBridgeError (base)
    ├── PackageNotFoundError
    └── CacheError

Error Codes:
    PACKAGE_NOT_FOUND - Requested package does not exist
    INVALID_INPUT - User input failed validation
    CACHE_ERROR - Failed to load or query APT cache
    UNKNOWN_ERROR - Unexpected or unclassified error
    UNKNOWN_COMMAND - Invalid command name

Error JSON Format:
    {
        "error": "Human-readable error message",
        "code": "MACHINE_READABLE_CODE",
        "details": "Optional additional context"
    }

Usage Example:
    try:
        if package_name not in cache:
            raise PackageNotFoundError(package_name)
    except APTBridgeError as e:
        print(format_error(e), file=sys.stderr)
        sys.exit(1)

Notes:
    - All APTBridgeError exceptions should be caught by CLI main()
    - Error messages should be user-friendly (avoid technical jargon)
    - Details field can contain technical information for debugging
    - Exit codes: 0 = success, 1 = expected error, 2 = unexpected error
"""

import json
from typing import Any


class APTBridgeError(Exception):
    """Base exception for all cockpit-apt-bridge errors."""

    def __init__(
        self, message: str, code: str = "UNKNOWN_ERROR", details: str | None = None
    ) -> None:
        """
        Initialize an APT Bridge error.

        Args:
            message: Human-readable error message
            code: Machine-readable error code
            details: Optional additional details
        """
        super().__init__(message)
        self.message = message
        self.code = code
        self.details = details


class PackageNotFoundError(APTBridgeError):
    """Exception raised when a package is not found."""

    def __init__(self, package_name: str) -> None:
        """Initialize a package not found error."""
        super().__init__(
            f"Package not found: {package_name}", code="PACKAGE_NOT_FOUND", details=package_name
        )


class CacheError(APTBridgeError):
    """Exception raised when APT cache operations fail."""

    def __init__(self, message: str, details: str | None = None) -> None:
        """Initialize a cache error."""
        super().__init__(message, code="CACHE_ERROR", details=details)


def format_error(error: APTBridgeError) -> str:
    """
    Format an error as JSON for output to stderr.

    Args:
        error: The error to format

    Returns:
        JSON string representation of the error
    """
    error_dict: dict[str, Any] = {
        "error": error.message,
        "code": error.code,
    }

    if error.details:
        error_dict["details"] = error.details

    return json.dumps(error_dict, indent=2)

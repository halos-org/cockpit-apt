"""
Error handling for cockpit-apt-bridge.

Defines custom exception classes and error formatting utilities.
"""

import json
from typing import Any


class APTBridgeError(Exception):
    """Base exception for all cockpit-apt-bridge errors."""

    def __init__(
        self,
        message: str,
        code: str = "UNKNOWN_ERROR",
        details: str | None = None
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
            f"Package not found: {package_name}",
            code="PACKAGE_NOT_FOUND",
            details=package_name
        )


class CacheError(APTBridgeError):
    """Exception raised when APT cache operations fail."""

    def __init__(self, message: str, details: str | None = None) -> None:
        """Initialize a cache error."""
        super().__init__(
            message,
            code="CACHE_ERROR",
            details=details
        )


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

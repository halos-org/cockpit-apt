"""
Input validation utilities for cockpit-apt-bridge.

Provides validation functions for package names, section names, and other user inputs.
All validators raise APTBridgeError with code INVALID_INPUT if validation fails.

Security Considerations:
    - Package names are validated to prevent path traversal attacks
    - Shell metacharacters are rejected to prevent command injection
    - Length limits prevent resource exhaustion
    - Patterns follow Debian policy for package and section naming

Validation Rules:
    Package names must:
        - Be non-empty
        - Contain only: a-z, 0-9, +, -, .
        - Start with a letter or digit
        - Not exceed 255 characters
        - Not contain path separators (/, \\) or shell metacharacters

    Section names must:
        - Be non-empty
        - Contain only: a-z, 0-9, -, /, _
        - Not exceed 100 characters
        - Not contain uppercase letters or special characters

References:
    - Debian Policy Manual: Package naming
    - https://www.debian.org/doc/debian-policy/ch-controlfields.html#s-f-source
"""

import re

from cockpit_apt_bridge.utils.errors import APTBridgeError


def validate_package_name(name: str) -> None:
    """
    Validate a Debian package name.

    Package names must:
    - Be non-empty
    - Contain only: a-z, 0-9, +, -, .
    - Not exceed 255 characters
    - Not contain path separators or shell metacharacters

    Args:
        name: Package name to validate

    Raises:
        APTBridgeError: If package name is invalid
    """
    if not name:
        raise APTBridgeError("Package name cannot be empty", code="INVALID_INPUT")

    if len(name) > 255:
        raise APTBridgeError(
            "Package name exceeds maximum length of 255 characters",
            code="INVALID_INPUT",
            details=f"Length: {len(name)}",
        )

    # Debian package name pattern: lowercase letters, digits, plus, minus, dot
    # Must start with lowercase letter or digit
    pattern = r"^[a-z0-9][a-z0-9+\-.]*$"
    if not re.match(pattern, name):
        raise APTBridgeError(
            f"Invalid package name: {name}",
            code="INVALID_INPUT",
            details=(
                "Package names must contain only: a-z, 0-9, +, -, . "
                "and start with a letter or digit"
            ),
        )

    # Additional security check: no path separators or shell metacharacters
    dangerous_chars = ["/", "\\", ";", "&", "|", "$", "`", "(", ")", "<", ">", "\n", "\r"]
    for char in dangerous_chars:
        if char in name:
            raise APTBridgeError(
                f"Invalid package name: contains forbidden character '{char}'",
                code="INVALID_INPUT",
                details="Package names cannot contain path separators or shell metacharacters",
            )


def validate_section_name(name: str) -> None:
    """
    Validate a Debian section name.

    Section names must:
    - Be non-empty
    - Contain only: a-z, 0-9, -, /, _
    - Not exceed 100 characters

    Args:
        name: Section name to validate

    Raises:
        APTBridgeError: If section name is invalid
    """
    if not name:
        raise APTBridgeError("Section name cannot be empty", code="INVALID_INPUT")

    if len(name) > 100:
        raise APTBridgeError(
            "Section name exceeds maximum length of 100 characters",
            code="INVALID_INPUT",
            details=f"Length: {len(name)}",
        )

    # Debian section name pattern: lowercase letters, digits, hyphen, slash, underscore
    # Examples: admin, net, contrib/net, non-free/games
    pattern = r"^[a-z0-9_\-/]+$"
    if not re.match(pattern, name):
        raise APTBridgeError(
            f"Invalid section name: {name}",
            code="INVALID_INPUT",
            details="Section names must contain only: a-z, 0-9, -, /, _",
        )

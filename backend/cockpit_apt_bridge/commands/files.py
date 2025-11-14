"""
Files command implementation.

Gets list of files installed by a package.
"""

import subprocess

from cockpit_apt_bridge.utils.errors import APTBridgeError, PackageNotFoundError
from cockpit_apt_bridge.utils.validators import validate_package_name


def execute(package_name: str) -> list[str]:
    """
    Get list of files installed by a package.

    Uses dpkg-query to list files from installed packages only.
    This is much more efficient than extracting .deb files for uninstalled packages.

    Args:
        package_name: Name of the installed package to query

    Returns:
        List of absolute file paths installed by the package.
        Directories are included in the list.

    Raises:
        APTBridgeError: If package name is invalid
        PackageNotFoundError: If package is not installed
        APTBridgeError: If dpkg-query command fails
    """
    # Validate package name
    validate_package_name(package_name)

    try:
        # Use dpkg-query to list files for installed package
        # -L lists files installed by package
        result = subprocess.run(
            ["dpkg-query", "-L", package_name], capture_output=True, text=True, check=True
        )

        # Parse output - one file per line
        files = [line.strip() for line in result.stdout.strip().split("\n") if line.strip()]

        return files

    except subprocess.CalledProcessError as e:
        # dpkg-query returns non-zero if package not installed
        if "not installed" in e.stderr or "is not installed" in e.stderr:
            raise PackageNotFoundError(package_name) from e
        raise APTBridgeError(
            f"dpkg-query failed for package '{package_name}'", details=e.stderr
        ) from e
    except Exception as e:
        raise APTBridgeError(f"Error listing files for '{package_name}'", details=str(e)) from e

"""
Remove command implementation.

Removes a package using apt-get with progress reporting via Status-Fd.
Progress is output as JSON lines to stdout for streaming to frontend.
"""

from typing import Any

from cockpit_apt.utils.apt_progress import run_apt_command
from cockpit_apt.utils.errors import APTBridgeError, PackageNotFoundError
from cockpit_apt.utils.validators import validate_package_name

# Essential packages that should never be removed
ESSENTIAL_PACKAGES = {
    "dpkg",
    "apt",
    "apt-get",
    "libc6",
    "init",
    "systemd",
    "base-files",
    "base-passwd",
    "bash",
    "coreutils",
}


def execute(package_name: str) -> dict[str, Any] | None:
    """
    Remove a package using apt-get.

    Uses apt-get remove with Status-Fd=3 for progress reporting.
    Outputs progress as JSON lines to stdout:
    - Progress: {"type": "progress", "percentage": int, "message": str}
    - Final: {"success": bool, "message": str, "package_name": str}

    Args:
        package_name: Name of the package to remove

    Returns:
        None (results are printed directly as JSON lines)

    Raises:
        APTBridgeError: If package name is invalid, essential, or command fails
        PackageNotFoundError: If package is not installed
    """
    validate_package_name(package_name)

    if package_name in ESSENTIAL_PACKAGES:
        raise APTBridgeError(
            f"Cannot remove essential package '{package_name}'",
            code="ESSENTIAL_PACKAGE",
            details="Removing this package may break your system",
        )

    cmd = ["apt-get", "remove", "-y", "-o", "APT::Status-Fd=3", package_name]

    def _classify_error(stderr: str) -> APTBridgeError | None:
        if "Unable to locate package" in stderr or "is not installed" in stderr:
            return PackageNotFoundError(package_name)
        return None

    run_apt_command(
        cmd,
        monotonic_progress=True,
        success_message="Removal complete",
        success_result={
            "success": True,
            "message": f"Successfully removed {package_name}",
            "package_name": package_name,
        },
        error_code="REMOVE_FAILED",
        error_message=f"Failed to remove package '{package_name}'",
        internal_error_message=f"Error removing '{package_name}'",
        classify_error=_classify_error,
    )

    return None

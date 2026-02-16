"""
Install command implementation.

Installs a package using apt-get with progress reporting via Status-Fd.
Progress is output as JSON lines to stdout for streaming to frontend.
"""

from typing import Any

from cockpit_apt.utils.apt_progress import run_apt_command
from cockpit_apt.utils.errors import APTBridgeError, PackageNotFoundError
from cockpit_apt.utils.validators import validate_package_name


def execute(package_name: str) -> dict[str, Any] | None:
    """
    Install a package using apt-get.

    Uses apt-get install with Status-Fd=3 for progress reporting.
    Outputs progress as JSON lines to stdout:
    - Progress: {"type": "progress", "percentage": int, "message": str}
    - Final: {"success": bool, "message": str, "package_name": str}

    Args:
        package_name: Name of the package to install

    Returns:
        None (results are printed directly as JSON lines)

    Raises:
        APTBridgeError: If package name is invalid or command fails
        PackageNotFoundError: If package doesn't exist
    """
    validate_package_name(package_name)

    cmd = [
        "apt-get",
        "install",
        "-y",
        "-o",
        "APT::Status-Fd=3",
        "-o",
        "Dpkg::Options::=--force-confdef",
        "-o",
        "Dpkg::Options::=--force-confold",
        package_name,
    ]

    def _classify_error(stderr: str) -> APTBridgeError | None:
        if "Unable to locate package" in stderr:
            return PackageNotFoundError(package_name)
        return None

    run_apt_command(
        cmd,
        monotonic_progress=True,
        success_message="Installation complete",
        success_result={
            "success": True,
            "message": f"Successfully installed {package_name}",
            "package_name": package_name,
        },
        error_code="INSTALL_FAILED",
        error_message=f"Failed to install package '{package_name}'",
        internal_error_message=f"Error installing '{package_name}'",
        classify_error=_classify_error,
    )

    return None

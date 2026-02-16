"""
Upgrade command implementation.

Upgrades all upgradable packages using apt-get upgrade.
Progress is output as JSON lines to stdout for streaming to frontend.
"""

from typing import Any

from cockpit_apt.utils.apt_progress import run_apt_command


def execute() -> dict[str, Any] | None:
    """
    Upgrade all upgradable packages using apt-get upgrade.

    Uses apt-get upgrade with Status-Fd=3 for progress reporting.
    Outputs progress as JSON lines to stdout:
    - Progress: {"type": "progress", "percentage": int, "message": str}
    - Final: {"success": bool, "message": str}

    Returns:
        None (results are printed directly as JSON lines)

    Raises:
        APTBridgeError: If command fails
    """
    cmd = [
        "apt-get",
        "upgrade",
        "-y",
        "-o",
        "APT::Status-Fd=3",
        "-o",
        "Dpkg::Options::=--force-confdef",
        "-o",
        "Dpkg::Options::=--force-confold",
    ]

    run_apt_command(
        cmd,
        monotonic_progress=False,
        success_message="Upgrade complete",
        success_result={"success": True, "message": "Upgrade complete"},
        error_code="UPGRADE_FAILED",
        error_message="Failed to upgrade packages",
        internal_error_message="Error upgrading packages",
    )

    return None

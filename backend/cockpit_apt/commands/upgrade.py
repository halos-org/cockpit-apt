"""
Upgrade command implementation.

Upgrades all upgradable packages using apt-get upgrade.
Progress is output as JSON lines to stdout for streaming to frontend.
"""

import json
import os
import select
import subprocess
from typing import Any

from cockpit_apt.utils.errors import APTBridgeError


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

    try:
        # Create pipe for Status-Fd (file descriptor 3)
        status_read, status_write = os.pipe()

        # Run apt-get with status pipe
        try:
            process = subprocess.Popen(
                cmd,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                pass_fds=(status_write,),
                text=True,
                env={**os.environ, "DEBIAN_FRONTEND": "noninteractive"},
            )
        except Exception:
            os.close(status_read)
            os.close(status_write)
            raise

        # Close write end in parent process
        os.close(status_write)

        # Read status updates from pipe
        status_file = os.fdopen(status_read, "r")

        # Buffer for partial lines
        status_buffer = ""

        # Poll for status updates while process runs
        while process.poll() is None:
            ready, _, _ = select.select([status_file], [], [], 0.1)

            if ready:
                chunk = status_file.read(1024)
                if chunk:
                    status_buffer += chunk

                    while "\n" in status_buffer:
                        line, status_buffer = status_buffer.split("\n", 1)
                        line = line.strip()

                        if line:
                            progress_info = _parse_status_line(line)
                            if progress_info:
                                progress_json = {
                                    "type": "progress",
                                    "percentage": progress_info["percentage"],
                                    "message": progress_info["message"],
                                }
                                print(json.dumps(progress_json), flush=True)

        # Read any remaining output
        _, stderr = process.communicate()
        status_file.close()

        # Check exit code
        if process.returncode != 0:
            if "dpkg was interrupted" in stderr:
                raise APTBridgeError("Package manager is locked", code="LOCKED", details=stderr)
            elif "You don't have enough free space" in stderr:
                raise APTBridgeError("Insufficient disk space", code="DISK_FULL", details=stderr)
            else:
                raise APTBridgeError(
                    "Failed to upgrade packages",
                    code="UPGRADE_FAILED",
                    details=stderr,
                )

        # Success
        final_progress = {"type": "progress", "percentage": 100, "message": "Upgrade complete"}
        print(json.dumps(final_progress), flush=True)

        final_result = {"success": True, "message": "Upgrade complete"}
        print(json.dumps(final_result), flush=True)

        return None

    except APTBridgeError:
        raise
    except Exception as e:
        raise APTBridgeError(
            "Error upgrading packages", code="INTERNAL_ERROR", details=str(e)
        ) from e


def _parse_status_line(line: str) -> dict[str, Any] | None:
    """
    Parse apt-get Status-Fd output line.

    Status-Fd formats:
    - pmstatus:package:percentage:message
    - dlstatus:package:percentage:message

    Args:
        line: Status line from apt-get

    Returns:
        dict with percentage and message, or None if not a status line
    """
    if not line:
        return None

    parts = line.split(":", 3)
    if len(parts) < 4:
        return None

    status_type, package, percent_str, message = parts

    if status_type not in ("pmstatus", "dlstatus"):
        return None

    try:
        percentage = float(percent_str)
        return {
            "percentage": int(percentage),
            "message": message.strip() or f"Processing {package}...",
        }
    except ValueError:
        return None

"""
Install command implementation.

Installs a package using apt-get with progress reporting via Status-Fd.
Progress is output as JSON lines to stdout for streaming to frontend.
"""

import json
import os
import select
import subprocess
from typing import Any

from cockpit_apt_bridge.utils.errors import APTBridgeError, PackageNotFoundError
from cockpit_apt_bridge.utils.validators import validate_package_name


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
        dict with:
        - success: bool
        - message: str (success/error message)
        - package_name: str

    Raises:
        APTBridgeError: If package name is invalid or command fails
        PackageNotFoundError: If package doesn't exist
    """
    # Validate package name
    validate_package_name(package_name)

    # Prepare apt-get command with Status-Fd
    # -y: assume yes to prompts
    # -o APT::Status-Fd=3: write status to file descriptor 3
    # -o Dpkg::Options::=--force-confdef: use default for conf file prompts
    # -o Dpkg::Options::=--force-confold: keep old conf files
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

    try:
        # Create pipe for Status-Fd (file descriptor 3)
        status_read, status_write = os.pipe()

        # Run apt-get with status pipe
        process = subprocess.Popen(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            pass_fds=(status_write,),  # Pass status_write as fd 3
            text=True,
            env={**os.environ, "DEBIAN_FRONTEND": "noninteractive"},
        )

        # Close write end in parent process
        os.close(status_write)

        # Read status updates from pipe
        status_file = os.fdopen(status_read, "r")

        # Buffer for partial lines
        status_buffer = ""

        # Track progress
        last_percentage = 0

        # Poll for status updates while process runs
        while process.poll() is None:
            # Check if there's data to read (non-blocking)
            ready, _, _ = select.select([status_file], [], [], 0.1)

            if ready:
                chunk = status_file.read(1024)
                if chunk:
                    status_buffer += chunk

                    # Process complete lines
                    while "\n" in status_buffer:
                        line, status_buffer = status_buffer.split("\n", 1)
                        line = line.strip()

                        if line:
                            # Parse Status-Fd line
                            progress_info = _parse_status_line(line)
                            if progress_info and progress_info["percentage"] > last_percentage:
                                last_percentage = progress_info["percentage"]
                                # Output progress as JSON line to stdout
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
            # Parse error from stderr
            if "Unable to locate package" in stderr:
                raise PackageNotFoundError(package_name)
            elif "dpkg was interrupted" in stderr:
                raise APTBridgeError("Package manager is locked", code="LOCKED", details=stderr)
            elif "You don't have enough free space" in stderr:
                raise APTBridgeError("Insufficient disk space", code="DISK_FULL", details=stderr)
            else:
                raise APTBridgeError(
                    f"Failed to install package '{package_name}'",
                    code="INSTALL_FAILED",
                    details=stderr,
                )

        # Success - output final progress
        final_progress = {"type": "progress", "percentage": 100, "message": "Installation complete"}
        print(json.dumps(final_progress), flush=True)

        # Output final result as single-line JSON
        final_result = {
            "success": True,
            "message": f"Successfully installed {package_name}",
            "package_name": package_name,
        }
        print(json.dumps(final_result), flush=True)

        # Return None so CLI doesn't print it again
        return None

    except (PackageNotFoundError, APTBridgeError):
        raise
    except Exception as e:
        raise APTBridgeError(
            f"Error installing '{package_name}'", code="INTERNAL_ERROR", details=str(e)
        )


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

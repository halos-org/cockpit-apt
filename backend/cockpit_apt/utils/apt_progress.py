"""
Shared apt-get subprocess progress utilities.

Provides parse_status_line() and run_apt_command() for running apt-get commands
with Status-Fd progress reporting. Used by install, upgrade, and remove commands.
"""

import json
import os
import select
import subprocess
from collections.abc import Callable
from typing import Any

from cockpit_apt.utils.errors import APTBridgeError


def parse_status_line(line: str) -> dict[str, Any] | None:
    """
    Parse apt-get Status-Fd output line.

    Status-Fd formats:
    - pmstatus:package:percentage:message
    - dlstatus:package:percentage:message

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


def run_apt_command(
    cmd: list[str],
    *,
    monotonic_progress: bool = True,
    success_message: str,
    success_result: dict[str, Any],
    error_code: str,
    error_message: str,
    internal_error_message: str,
    classify_error: Callable[[str], APTBridgeError | None] | None = None,
) -> None:
    """
    Run an apt-get command with Status-Fd progress reporting.

    Sets up a pipe for apt-get's Status-Fd, reads progress updates via select(),
    and outputs JSON progress lines to stdout.

    Args:
        cmd: The full apt-get command to run.
        monotonic_progress: If True, only report strictly increasing percentages.
            Use False for upgrade where progress resets per package.
        success_message: Message for the final 100% progress line.
        success_result: Dict to print as the final JSON result on success.
        error_code: Error code for generic (unclassified) failures.
        error_message: Error message for generic failures.
        internal_error_message: Message for wrapping unexpected exceptions.
        classify_error: Optional callback for command-specific error classification.
            Receives stderr string, returns APTBridgeError or None to fall through.
    """
    try:
        status_read, status_write = os.pipe()

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

        os.close(status_write)

        status_file = os.fdopen(status_read, "r")
        status_buffer = ""
        last_percentage = 0

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
                            progress_info = parse_status_line(line)
                            if progress_info:
                                should_report = (
                                    not monotonic_progress
                                    or progress_info["percentage"] > last_percentage
                                )
                                if should_report:
                                    last_percentage = progress_info["percentage"]
                                    print(
                                        json.dumps({
                                            "type": "progress",
                                            "percentage": progress_info["percentage"],
                                            "message": progress_info["message"],
                                        }),
                                        flush=True,
                                    )

        _, stderr = process.communicate()
        status_file.close()

        if process.returncode != 0:
            if classify_error:
                err = classify_error(stderr)
                if err:
                    raise err

            if "dpkg was interrupted" in stderr:
                raise APTBridgeError(
                    "Package manager is locked", code="LOCKED", details=stderr
                )
            elif "You don't have enough free space" in stderr:
                raise APTBridgeError(
                    "Insufficient disk space", code="DISK_FULL", details=stderr
                )
            else:
                raise APTBridgeError(error_message, code=error_code, details=stderr)

        print(
            json.dumps({"type": "progress", "percentage": 100, "message": success_message}),
            flush=True,
        )
        print(json.dumps(success_result), flush=True)

    except APTBridgeError:
        raise
    except Exception as e:
        raise APTBridgeError(
            internal_error_message, code="INTERNAL_ERROR", details=str(e)
        ) from e

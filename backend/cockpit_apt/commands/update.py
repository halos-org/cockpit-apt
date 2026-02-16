"""
Update command implementation.

Updates package lists using apt-get update.
Progress is output as JSON lines to stdout for streaming to frontend.
"""

import json
import os
import re
import subprocess
import threading
from typing import Any

from cockpit_apt.utils.errors import APTBridgeError


def execute() -> dict[str, Any] | None:
    """
    Update package lists using apt-get update.

    Note: apt-get update doesn't provide good Status-Fd output,
    so we parse stdout for progress indication.

    Outputs progress as JSON lines to stdout:
    - Progress: {"type": "progress", "percentage": int, "message": str}
    - Final: {"success": bool, "message": str}

    Returns:
        dict with:
        - success: bool
        - message: str (success/error message)

    Raises:
        APTBridgeError: If command fails
    """
    cmd = ["apt-get", "update"]

    try:
        # Run apt-get update
        process = subprocess.Popen(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,  # Merge stderr into stdout
            text=True,
            env={**os.environ, "DEBIAN_FRONTEND": "noninteractive"},
        )

        # Track progress
        total_repos = 0
        completed_repos = 0
        output_lines: list[str] = []
        timed_out = False

        # Kill the process if the overall operation exceeds 5 minutes.
        # The timeout must cover the readline loop (where a real hang occurs),
        # not just process.wait().
        def kill_on_timeout() -> None:
            nonlocal timed_out
            timed_out = True
            process.kill()

        timer = threading.Timer(300, kill_on_timeout)
        timer.start()

        try:
            # Read output line by line
            if process.stdout:
                for line in iter(process.stdout.readline, ""):
                    if not line:
                        break

                    line = line.strip()
                    output_lines.append(line)

                    # Parse progress from output
                    # Look for lines like "Get:1 http://..." or "Hit:1 http://..."
                    if line.startswith(("Get:", "Hit:", "Ign:")):
                        # Extract repository being processed
                        match = re.match(r"(Get|Hit|Ign):(\d+)\s+(.+)", line)
                        if match:
                            repo_num = int(match.group(2))
                            repo_url = match.group(3)

                            # Update total if we see a higher number
                            if repo_num > total_repos:
                                total_repos = repo_num

                            # Track completed
                            if match.group(1) in ("Hit", "Get"):
                                completed_repos = repo_num

                            # Calculate percentage
                            if total_repos > 0:
                                percentage = int(
                                    (completed_repos / total_repos) * 100
                                )
                                progress_json = {
                                    "type": "progress",
                                    "percentage": percentage,
                                    "message": f"Updating: {repo_url[:60]}...",
                                }
                                print(json.dumps(progress_json), flush=True)

            process.wait()

            if timed_out:
                raise APTBridgeError(
                    "Package list update timed out after 5 minutes",
                    code="TIMEOUT",
                )
        finally:
            timer.cancel()

        # Check exit code - use collected output_lines since stderr is merged into stdout
        if process.returncode != 0:
            combined_output = "\n".join(output_lines)

            if "Could not resolve" in combined_output:
                raise APTBridgeError(
                    "Network error: Unable to reach package repositories",
                    code="NETWORK_ERROR",
                    details=combined_output,
                )
            elif "dpkg was interrupted" in combined_output:
                raise APTBridgeError(
                    "Package manager is locked", code="LOCKED", details=combined_output
                )
            else:
                raise APTBridgeError(
                    "Failed to update package lists",
                    code="UPDATE_FAILED",
                    details=combined_output,
                )

        # Success - output final progress
        final_progress = {"type": "progress", "percentage": 100, "message": "Package lists updated"}
        print(json.dumps(final_progress), flush=True)

        # Output final result as single-line JSON
        final_result = {"success": True, "message": "Successfully updated package lists"}
        print(json.dumps(final_result), flush=True)

        # Return None so CLI doesn't print it again
        return None

    except APTBridgeError:
        raise
    except Exception as e:
        raise APTBridgeError(
            "Error updating package lists", code="INTERNAL_ERROR", details=str(e)
        ) from e

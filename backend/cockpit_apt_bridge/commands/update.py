"""
Update command implementation.

Updates package lists using apt-get update.
Progress is output as JSON lines to stdout for streaming to frontend.
"""

import json
import os
import re
import subprocess
from typing import Any

from cockpit_apt_bridge.utils.errors import APTBridgeError


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

        # Read output line by line
        if process.stdout:
            for line in iter(process.stdout.readline, ""):
                if not line:
                    break

                line = line.strip()

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
                            percentage = int((completed_repos / total_repos) * 100)
                            progress_json = {
                                "type": "progress",
                                "percentage": percentage,
                                "message": f"Updating: {repo_url[:60]}...",
                            }
                            print(json.dumps(progress_json), flush=True)

        # Wait for process to complete
        process.wait()

        # Check exit code
        if process.returncode != 0:
            # Get stderr output
            _, stderr = process.communicate()

            if "Could not resolve" in (stderr or ""):
                raise APTBridgeError(
                    "Network error: Unable to reach package repositories",
                    code="NETWORK_ERROR",
                    details=stderr,
                )
            elif "dpkg was interrupted" in (stderr or ""):
                raise APTBridgeError("Package manager is locked", code="LOCKED", details=stderr)
            else:
                raise APTBridgeError(
                    "Failed to update package lists", code="UPDATE_FAILED", details=stderr
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
        raise APTBridgeError("Error updating package lists", code="INTERNAL_ERROR", details=str(e))

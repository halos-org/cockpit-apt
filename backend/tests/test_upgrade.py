"""
Tests for upgrade command.

Tests the upgrade command using mocked subprocess to avoid requiring root/APT.
"""

import json
from unittest.mock import Mock, patch

import pytest

from cockpit_apt.commands.upgrade import execute
from cockpit_apt.utils.errors import APTBridgeError

# Mock paths target the shared module where subprocess calls now live
_MOD = "cockpit_apt.utils.apt_progress"


class TestExecute:
    """Test execute function."""

    @patch(f"{_MOD}.subprocess.Popen")
    @patch(f"{_MOD}.os.pipe")
    @patch(f"{_MOD}.os.close")
    @patch(f"{_MOD}.os.fdopen")
    @patch(f"{_MOD}.select.select")
    @patch("builtins.print")
    def test_upgrade_success(
        self, mock_print, mock_select, mock_fdopen, mock_close, mock_pipe, mock_popen
    ):
        """Test successful upgrade."""
        mock_pipe.return_value = (3, 4)

        status_lines = [
            "pmstatus:nginx:25.0:Unpacking nginx\n",
            "pmstatus:nginx:50.0:Setting up nginx\n",
            "pmstatus:curl:75.0:Setting up curl\n",
        ]
        mock_status_file = Mock()
        mock_status_file.read.side_effect = status_lines + [""]
        mock_status_file.close = Mock()
        mock_fdopen.return_value = mock_status_file

        mock_select.return_value = ([mock_status_file], [], [])

        mock_process = Mock()
        mock_process.poll.side_effect = [None, None, None, 0]
        mock_process.returncode = 0
        mock_process.communicate.return_value = ("", "")
        mock_popen.return_value = mock_process

        result = execute()

        assert result is None

        mock_popen.assert_called_once()
        call_args = mock_popen.call_args
        cmd = call_args[0][0]
        assert "apt-get" in cmd
        assert "upgrade" in cmd
        assert "-y" in cmd

        # Verify progress was printed (at least progress + final)
        assert mock_print.call_count >= 2

        mock_close.assert_called()

    @patch(f"{_MOD}.subprocess.Popen")
    @patch(f"{_MOD}.os.pipe")
    @patch(f"{_MOD}.os.close")
    @patch(f"{_MOD}.os.fdopen")
    @patch(f"{_MOD}.select.select")
    def test_upgrade_locked(self, mock_select, mock_fdopen, mock_close, mock_pipe, mock_popen):
        """Test upgrade when package manager is locked."""
        mock_pipe.return_value = (3, 4)
        mock_status_file = Mock()
        mock_status_file.read.return_value = ""
        mock_status_file.close = Mock()
        mock_fdopen.return_value = mock_status_file
        mock_select.return_value = ([], [], [])

        mock_process = Mock()
        mock_process.poll.return_value = 100
        mock_process.returncode = 100
        mock_process.communicate.return_value = ("", "dpkg was interrupted")
        mock_popen.return_value = mock_process

        with pytest.raises(APTBridgeError) as exc_info:
            execute()

        assert exc_info.value.code == "LOCKED"

    @patch(f"{_MOD}.subprocess.Popen")
    @patch(f"{_MOD}.os.pipe")
    @patch(f"{_MOD}.os.close")
    @patch(f"{_MOD}.os.fdopen")
    @patch(f"{_MOD}.select.select")
    def test_upgrade_disk_full(self, mock_select, mock_fdopen, mock_close, mock_pipe, mock_popen):
        """Test upgrade when disk is full."""
        mock_pipe.return_value = (3, 4)
        mock_status_file = Mock()
        mock_status_file.read.return_value = ""
        mock_status_file.close = Mock()
        mock_fdopen.return_value = mock_status_file
        mock_select.return_value = ([], [], [])

        mock_process = Mock()
        mock_process.poll.return_value = 100
        mock_process.returncode = 100
        mock_process.communicate.return_value = ("", "You don't have enough free space")
        mock_popen.return_value = mock_process

        with pytest.raises(APTBridgeError) as exc_info:
            execute()

        assert exc_info.value.code == "DISK_FULL"

    @patch(f"{_MOD}.subprocess.Popen")
    @patch(f"{_MOD}.os.pipe")
    @patch(f"{_MOD}.os.close")
    @patch(f"{_MOD}.os.fdopen")
    @patch(f"{_MOD}.select.select")
    def test_upgrade_generic_failure(
        self, mock_select, mock_fdopen, mock_close, mock_pipe, mock_popen
    ):
        """Test upgrade with generic failure."""
        mock_pipe.return_value = (3, 4)
        mock_status_file = Mock()
        mock_status_file.read.return_value = ""
        mock_status_file.close = Mock()
        mock_fdopen.return_value = mock_status_file
        mock_select.return_value = ([], [], [])

        mock_process = Mock()
        mock_process.poll.return_value = 1
        mock_process.returncode = 1
        mock_process.communicate.return_value = ("", "Some error")
        mock_popen.return_value = mock_process

        with pytest.raises(APTBridgeError) as exc_info:
            execute()

        assert exc_info.value.code == "UPGRADE_FAILED"

    @patch(f"{_MOD}.subprocess.Popen")
    @patch(f"{_MOD}.os.pipe")
    def test_upgrade_exception_handling(self, mock_pipe, mock_popen):
        """Test exception handling during upgrade."""
        mock_pipe.side_effect = Exception("Pipe creation failed")

        with pytest.raises(APTBridgeError) as exc_info:
            execute()

        assert exc_info.value.code == "INTERNAL_ERROR"

    @patch(f"{_MOD}.os.close")
    @patch(f"{_MOD}.os.pipe")
    @patch(f"{_MOD}.subprocess.Popen")
    def test_popen_failure_closes_both_fds(self, mock_popen, mock_pipe, mock_close):
        """Test that both pipe FDs are closed if Popen raises."""
        mock_pipe.return_value = (3, 4)
        mock_popen.side_effect = OSError("Failed to exec")

        with pytest.raises(APTBridgeError):
            execute()

        # Both FDs should be closed
        mock_close.assert_any_call(3)
        mock_close.assert_any_call(4)

    @patch(f"{_MOD}.subprocess.Popen")
    @patch(f"{_MOD}.os.pipe")
    @patch(f"{_MOD}.os.close")
    @patch(f"{_MOD}.os.fdopen")
    @patch(f"{_MOD}.select.select")
    @patch("builtins.print")
    def test_non_monotonic_progress_reported(
        self, mock_print, mock_select, mock_fdopen, mock_close, mock_pipe, mock_popen
    ):
        """Test that non-monotonic progress (per-package resets) is still reported."""
        mock_pipe.return_value = (3, 4)

        # Simulate multi-package upgrade: progress resets per package
        status_lines = [
            "pmstatus:pkg-a:50.0:Setting up pkg-a\n",
            "pmstatus:pkg-a:100.0:Installed pkg-a\n",
            "pmstatus:pkg-b:25.0:Unpacking pkg-b\n",  # Resets to 25
        ]
        mock_status_file = Mock()
        mock_status_file.read.side_effect = status_lines + [""]
        mock_status_file.close = Mock()
        mock_fdopen.return_value = mock_status_file

        mock_select.return_value = ([mock_status_file], [], [])

        mock_process = Mock()
        mock_process.poll.side_effect = [None, None, None, 0]
        mock_process.returncode = 0
        mock_process.communicate.return_value = ("", "")
        mock_popen.return_value = mock_process

        execute()

        # Collect all progress prints from status lines (exclude final 100% and result)
        progress_calls = []
        for call in mock_print.call_args_list:
            data = json.loads(call[0][0])
            if data.get("type") == "progress":
                progress_calls.append(data["percentage"])

        # Status line progress (50, 100, 25) + final 100% = 4 entries
        # The key assertion: 25 appears after 100, proving no monotonicity guard
        assert progress_calls == [50, 100, 25, 100]

    @patch(f"{_MOD}.subprocess.Popen")
    @patch(f"{_MOD}.os.pipe")
    @patch(f"{_MOD}.os.close")
    @patch(f"{_MOD}.os.fdopen")
    @patch(f"{_MOD}.select.select")
    @patch("builtins.print")
    def test_success_message(
        self, mock_print, mock_select, mock_fdopen, mock_close, mock_pipe, mock_popen
    ):
        """Test that success message says 'Upgrade complete' (not 'all packages')."""
        mock_pipe.return_value = (3, 4)

        mock_status_file = Mock()
        mock_status_file.read.return_value = ""
        mock_status_file.close = Mock()
        mock_fdopen.return_value = mock_status_file
        mock_select.return_value = ([], [], [])

        mock_process = Mock()
        mock_process.poll.return_value = 0
        mock_process.returncode = 0
        mock_process.communicate.return_value = ("", "")
        mock_popen.return_value = mock_process

        execute()

        # Find the final result message
        final_result = None
        for call in mock_print.call_args_list:
            data = json.loads(call[0][0])
            if "success" in data:
                final_result = data
                break

        assert final_result is not None
        assert final_result["success"] is True
        assert final_result["message"] == "Upgrade complete"

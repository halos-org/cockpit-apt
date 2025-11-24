"""
Tests for update command.

Tests the update command using mocked subprocess to avoid requiring root/APT.
"""

from unittest.mock import Mock, patch

import pytest

from cockpit_apt.commands.update import execute
from cockpit_apt.utils.errors import APTBridgeError


class TestExecute:
    """Test execute function."""

    @patch("cockpit_apt.commands.update.subprocess.Popen")
    @patch("builtins.print")
    def test_update_success(self, mock_print, mock_popen):
        """Test successful package list update."""
        # Create mock process with typical apt-get update output
        output_lines = [
            "Hit:1 http://archive.ubuntu.com/ubuntu jammy InRelease\n",
            "Get:2 http://archive.ubuntu.com/ubuntu jammy-updates InRelease [119 kB]\n",
            "Get:3 http://security.ubuntu.com/ubuntu jammy-security InRelease [110 kB]\n",
            "Fetched 229 kB in 1s (180 kB/s)\n",
            "Reading package lists...\n",
        ]

        mock_process = Mock()
        mock_process.stdout.readline.side_effect = output_lines + [""]
        mock_process.wait.return_value = 0
        mock_process.returncode = 0
        mock_popen.return_value = mock_process

        # Execute
        result = execute()

        # Verify result
        assert result is None  # Returns None to avoid duplicate output

        # Verify apt-get was called
        mock_popen.assert_called_once()
        call_args = mock_popen.call_args
        cmd = call_args[0][0]
        assert "apt-get" in cmd
        assert "update" in cmd

        # Verify progress was printed
        assert mock_print.call_count >= 1

    @patch("cockpit_apt.commands.update.subprocess.Popen")
    @patch("builtins.print")
    def test_update_with_ignored_repos(self, mock_print, mock_popen):
        """Test update with some ignored repositories."""
        output_lines = [
            "Hit:1 http://archive.ubuntu.com/ubuntu jammy InRelease\n",
            "Ign:2 http://ppa.launchpad.net/broken/ppa/ubuntu jammy InRelease\n",
            "Get:3 http://security.ubuntu.com/ubuntu jammy-security InRelease [110 kB]\n",
            "Reading package lists...\n",
        ]

        mock_process = Mock()
        mock_process.stdout.readline.side_effect = output_lines + [""]
        mock_process.wait.return_value = 0
        mock_process.returncode = 0
        mock_popen.return_value = mock_process

        # Execute
        result = execute()

        # Should complete successfully even with ignored repos
        assert result is None

    @patch("cockpit_apt.commands.update.subprocess.Popen")
    def test_update_failure(self, mock_popen):
        """Test update failure."""
        output_lines = [
            "Err:1 http://archive.ubuntu.com/ubuntu jammy InRelease\n",
            "  Could not resolve 'archive.ubuntu.com'\n",
            "Reading package lists...\n",
        ]

        mock_process = Mock()
        mock_process.stdout.readline.side_effect = output_lines + [""]
        mock_process.wait.return_value = 100
        mock_process.returncode = 100
        mock_process.communicate.return_value = ("Some error output", "")
        mock_popen.return_value = mock_process

        # Execute and verify error
        with pytest.raises(APTBridgeError) as exc_info:
            execute()

        assert exc_info.value.code == "UPDATE_FAILED"

    @patch("cockpit_apt.commands.update.subprocess.Popen")
    def test_update_locked(self, mock_popen):
        """Test update when package manager is locked."""
        output_lines = [
            "E: Could not get lock /var/lib/apt/lists/lock\n",
        ]

        mock_process = Mock()
        mock_process.stdout.readline.side_effect = output_lines + [""]
        mock_process.wait.return_value = 100
        mock_process.returncode = 100
        # Put lock error in stderr where update.py checks for it
        mock_process.communicate.return_value = ("", "dpkg was interrupted")
        mock_popen.return_value = mock_process

        # Execute and verify error
        with pytest.raises(APTBridgeError) as exc_info:
            execute()

        assert exc_info.value.code == "LOCKED"

    @patch("cockpit_apt.commands.update.subprocess.Popen")
    def test_update_exception_handling(self, mock_popen):
        """Test exception handling during update."""
        # Make Popen raise exception
        mock_popen.side_effect = Exception("Process creation failed")

        # Execute and verify error
        with pytest.raises(APTBridgeError) as exc_info:
            execute()

        assert exc_info.value.code == "INTERNAL_ERROR"

    @patch("cockpit_apt.commands.update.subprocess.Popen")
    @patch("builtins.print")
    def test_update_progress_reporting(self, mock_print, mock_popen):
        """Test that progress is reported during update."""
        # Create output with multiple repositories
        output_lines = [
            "Hit:1 http://archive.ubuntu.com/ubuntu jammy InRelease\n",
            "Get:2 http://archive.ubuntu.com/ubuntu jammy-updates InRelease [119 kB]\n",
            "Get:3 http://archive.ubuntu.com/ubuntu jammy-backports InRelease [99 kB]\n",
            "Get:4 http://security.ubuntu.com/ubuntu jammy-security InRelease [110 kB]\n",
            "Fetched 328 kB in 1s (250 kB/s)\n",
            "Reading package lists...\n",
        ]

        mock_process = Mock()
        mock_process.stdout.readline.side_effect = output_lines + [""]
        mock_process.wait.return_value = 0
        mock_process.returncode = 0
        mock_popen.return_value = mock_process

        # Execute
        execute()

        # Verify progress was reported multiple times
        # Should have at least: progress updates + final message
        assert mock_print.call_count >= 3

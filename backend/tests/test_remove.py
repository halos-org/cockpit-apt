"""
Tests for remove command.

Tests the remove command using mocked subprocess to avoid requiring root/APT.
"""

from unittest.mock import Mock, patch

import pytest

from cockpit_apt.commands.remove import execute
from cockpit_apt.utils.errors import APTBridgeError, PackageNotFoundError


class TestExecute:
    """Test execute function."""

    @patch("cockpit_apt.commands.remove.subprocess.Popen")
    @patch("cockpit_apt.commands.remove.os.pipe")
    @patch("cockpit_apt.commands.remove.os.close")
    @patch("cockpit_apt.commands.remove.os.fdopen")
    @patch("cockpit_apt.commands.remove.select.select")
    @patch("builtins.print")
    def test_remove_success(
        self, mock_print, mock_select, mock_fdopen, mock_close, mock_pipe, mock_popen
    ):
        """Test successful package removal."""
        # Setup pipe mocks
        mock_pipe.return_value = (3, 4)

        # Create mock status file
        status_lines = [
            "pmstatus:nginx:25.0:Removing nginx\n",
            "pmstatus:nginx:50.0:Removing nginx files\n",
            "pmstatus:nginx:75.0:Cleaning up\n",
        ]
        mock_status_file = Mock()
        mock_status_file.read.side_effect = status_lines + [""]
        mock_fdopen.return_value = mock_status_file

        # Setup select to return data available
        mock_select.return_value = ([mock_status_file], [], [])

        # Setup process mock
        mock_process = Mock()
        mock_process.poll.side_effect = [None, None, None, 0]  # Running then done
        mock_process.returncode = 0
        mock_process.communicate.return_value = ("", "")
        mock_popen.return_value = mock_process

        # Execute
        result = execute("nginx")

        # Verify result
        assert result is None  # Returns None to avoid duplicate output

        # Verify apt-get was called correctly
        mock_popen.assert_called_once()
        call_args = mock_popen.call_args
        cmd = call_args[0][0]
        assert "apt-get" in cmd
        assert "remove" in cmd
        assert "nginx" in cmd
        assert "-y" in cmd

    def test_remove_essential_package(self):
        """Test removal of essential package is blocked."""
        for essential_pkg in ["dpkg", "apt", "systemd", "bash"]:
            with pytest.raises(APTBridgeError) as exc_info:
                execute(essential_pkg)

            assert exc_info.value.code == "ESSENTIAL_PACKAGE"

    @patch("cockpit_apt.commands.remove.subprocess.Popen")
    @patch("cockpit_apt.commands.remove.os.pipe")
    @patch("cockpit_apt.commands.remove.os.close")
    @patch("cockpit_apt.commands.remove.os.fdopen")
    @patch("cockpit_apt.commands.remove.select.select")
    def test_remove_not_installed(
        self, mock_select, mock_fdopen, mock_close, mock_pipe, mock_popen
    ):
        """Test removal of package that's not installed."""
        # Setup mocks
        mock_pipe.return_value = (3, 4)
        mock_status_file = Mock()
        mock_status_file.read.return_value = ""
        mock_status_file.close = Mock()
        mock_fdopen.return_value = mock_status_file
        mock_select.return_value = ([], [], [])

        # Setup process to fail with package not installed
        mock_process = Mock()
        mock_process.poll.return_value = 100
        mock_process.returncode = 100
        mock_process.communicate.return_value = ("", "Package 'notinstalled' is not installed")
        mock_popen.return_value = mock_process

        # Execute and verify error
        with pytest.raises(PackageNotFoundError):
            execute("notinstalled")

    @patch("cockpit_apt.commands.remove.subprocess.Popen")
    @patch("cockpit_apt.commands.remove.os.pipe")
    @patch("cockpit_apt.commands.remove.os.close")
    @patch("cockpit_apt.commands.remove.os.fdopen")
    @patch("cockpit_apt.commands.remove.select.select")
    def test_remove_locked(self, mock_select, mock_fdopen, mock_close, mock_pipe, mock_popen):
        """Test removal when package manager is locked."""
        # Setup mocks
        mock_pipe.return_value = (3, 4)
        mock_status_file = Mock()
        mock_status_file.read.return_value = ""
        mock_status_file.close = Mock()
        mock_fdopen.return_value = mock_status_file
        mock_select.return_value = ([], [], [])

        # Setup process to fail with lock error
        mock_process = Mock()
        mock_process.poll.return_value = 100
        mock_process.returncode = 100
        mock_process.communicate.return_value = ("", "dpkg was interrupted")
        mock_popen.return_value = mock_process

        # Execute and verify error
        with pytest.raises(APTBridgeError) as exc_info:
            execute("nginx")

        assert exc_info.value.code == "LOCKED"

    @patch("cockpit_apt.commands.remove.subprocess.Popen")
    @patch("cockpit_apt.commands.remove.os.pipe")
    @patch("cockpit_apt.commands.remove.os.close")
    @patch("cockpit_apt.commands.remove.os.fdopen")
    @patch("cockpit_apt.commands.remove.select.select")
    def test_remove_generic_failure(
        self, mock_select, mock_fdopen, mock_close, mock_pipe, mock_popen
    ):
        """Test removal with generic failure."""
        # Setup mocks
        mock_pipe.return_value = (3, 4)
        mock_status_file = Mock()
        mock_status_file.read.return_value = ""
        mock_status_file.close = Mock()
        mock_fdopen.return_value = mock_status_file
        mock_select.return_value = ([], [], [])

        # Setup process to fail
        mock_process = Mock()
        mock_process.poll.return_value = 1
        mock_process.returncode = 1
        mock_process.communicate.return_value = ("", "Some error")
        mock_popen.return_value = mock_process

        # Execute and verify error
        with pytest.raises(APTBridgeError) as exc_info:
            execute("nginx")

        assert exc_info.value.code == "REMOVE_FAILED"

    def test_remove_invalid_package_name(self):
        """Test removal with invalid package name."""
        with pytest.raises(APTBridgeError):
            execute("../etc/passwd")

        with pytest.raises(APTBridgeError):
            execute("pkg;rm -rf /")

    @patch("cockpit_apt.commands.remove.subprocess.Popen")
    @patch("cockpit_apt.commands.remove.os.pipe")
    def test_remove_exception_handling(self, mock_pipe, mock_popen):
        """Test exception handling during removal."""
        # Make pipe() raise exception
        mock_pipe.side_effect = Exception("Pipe creation failed")

        # Execute and verify error
        with pytest.raises(APTBridgeError) as exc_info:
            execute("nginx")

        assert exc_info.value.code == "INTERNAL_ERROR"

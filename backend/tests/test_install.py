"""
Tests for install command.

Tests the install command using mocked subprocess to avoid requiring root/APT.
"""

from unittest.mock import Mock, patch

import pytest

from cockpit_apt.commands.install import execute
from cockpit_apt.utils.errors import APTBridgeError, PackageNotFoundError

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
    def test_install_success(
        self, mock_print, mock_select, mock_fdopen, mock_close, mock_pipe, mock_popen
    ):
        """Test successful package installation."""
        mock_pipe.return_value = (3, 4)

        status_lines = [
            "pmstatus:nginx:25.0:Downloading nginx\n",
            "pmstatus:nginx:50.0:Unpacking nginx\n",
            "pmstatus:nginx:75.0:Setting up nginx\n",
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

        result = execute("nginx")

        assert result is None

        mock_popen.assert_called_once()
        call_args = mock_popen.call_args
        cmd = call_args[0][0]
        assert "apt-get" in cmd
        assert "install" in cmd
        assert "nginx" in cmd
        assert "-y" in cmd

        assert mock_print.call_count >= 2

        mock_close.assert_called()

    @patch(f"{_MOD}.subprocess.Popen")
    @patch(f"{_MOD}.os.pipe")
    @patch(f"{_MOD}.os.close")
    @patch(f"{_MOD}.os.fdopen")
    @patch(f"{_MOD}.select.select")
    def test_install_package_not_found(
        self, mock_select, mock_fdopen, mock_close, mock_pipe, mock_popen
    ):
        """Test installation of non-existent package."""
        mock_pipe.return_value = (3, 4)
        mock_status_file = Mock()
        mock_status_file.read.return_value = ""
        mock_status_file.close = Mock()
        mock_fdopen.return_value = mock_status_file
        mock_select.return_value = ([], [], [])

        mock_process = Mock()
        mock_process.poll.return_value = 100
        mock_process.returncode = 100
        mock_process.communicate.return_value = ("", "Unable to locate package nonexistent")
        mock_popen.return_value = mock_process

        with pytest.raises(PackageNotFoundError):
            execute("nonexistent")

    @patch(f"{_MOD}.subprocess.Popen")
    @patch(f"{_MOD}.os.pipe")
    @patch(f"{_MOD}.os.close")
    @patch(f"{_MOD}.os.fdopen")
    @patch(f"{_MOD}.select.select")
    def test_install_locked(self, mock_select, mock_fdopen, mock_close, mock_pipe, mock_popen):
        """Test installation when package manager is locked."""
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
            execute("nginx")

        assert exc_info.value.code == "LOCKED"

    @patch(f"{_MOD}.subprocess.Popen")
    @patch(f"{_MOD}.os.pipe")
    @patch(f"{_MOD}.os.close")
    @patch(f"{_MOD}.os.fdopen")
    @patch(f"{_MOD}.select.select")
    def test_install_disk_full(self, mock_select, mock_fdopen, mock_close, mock_pipe, mock_popen):
        """Test installation when disk is full."""
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
            execute("nginx")

        assert exc_info.value.code == "DISK_FULL"

    @patch(f"{_MOD}.subprocess.Popen")
    @patch(f"{_MOD}.os.pipe")
    @patch(f"{_MOD}.os.fdopen")
    @patch(f"{_MOD}.select.select")
    def test_install_generic_failure(self, mock_select, mock_fdopen, mock_pipe, mock_popen):
        """Test installation with generic failure."""
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
            execute("nginx")

        assert exc_info.value.code == "INSTALL_FAILED"

    def test_install_invalid_package_name(self):
        """Test installation with invalid package name."""
        with pytest.raises(APTBridgeError):
            execute("../etc/passwd")

        with pytest.raises(APTBridgeError):
            execute("pkg;rm -rf /")

    @patch(f"{_MOD}.subprocess.Popen")
    @patch(f"{_MOD}.os.pipe")
    def test_install_exception_handling(self, mock_pipe, mock_popen):
        """Test exception handling during installation."""
        mock_pipe.side_effect = Exception("Pipe creation failed")

        with pytest.raises(APTBridgeError) as exc_info:
            execute("nginx")

        assert exc_info.value.code == "INTERNAL_ERROR"

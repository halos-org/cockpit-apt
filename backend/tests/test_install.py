"""
Tests for install command.

Tests the install command using mocked subprocess to avoid requiring root/APT.
"""

import io
import json
import os
from unittest.mock import MagicMock, Mock, mock_open, patch

import pytest

from cockpit_apt_bridge.commands.install import _parse_status_line, execute
from cockpit_apt_bridge.utils.errors import APTBridgeError, PackageNotFoundError


class TestParseStatusLine:
    """Test _parse_status_line helper function."""

    def test_parse_pmstatus_line(self):
        """Test parsing pmstatus line."""
        line = "pmstatus:nginx:25.5:Installing nginx"
        result = _parse_status_line(line)

        assert result is not None
        assert result["percentage"] == 25
        assert "nginx" in result["message"]

    def test_parse_dlstatus_line(self):
        """Test parsing dlstatus line."""
        line = "dlstatus:curl:50.0:Downloading curl"
        result = _parse_status_line(line)

        assert result is not None
        assert result["percentage"] == 50
        assert "curl" in result["message"]

    def test_parse_line_with_colon_in_message(self):
        """Test parsing line with colon in message."""
        line = "pmstatus:vim:75.0:Setting up: vim"
        result = _parse_status_line(line)

        assert result is not None
        assert result["percentage"] == 75
        assert ":" in result["message"]

    def test_parse_empty_message(self):
        """Test parsing line with empty message - uses package name."""
        line = "pmstatus:git:100.0:"
        result = _parse_status_line(line)

        assert result is not None
        assert result["percentage"] == 100
        assert "git" in result["message"].lower()

    def test_parse_invalid_line(self):
        """Test parsing invalid line returns None."""
        assert _parse_status_line("") is None
        assert _parse_status_line("invalid") is None
        assert _parse_status_line("pmstatus:only:two") is None
        assert _parse_status_line("unknown:pkg:50:msg") is None

    def test_parse_invalid_percentage(self):
        """Test parsing line with invalid percentage."""
        line = "pmstatus:pkg:invalid:message"
        result = _parse_status_line(line)

        assert result is None


class TestExecute:
    """Test execute function."""

    @patch("cockpit_apt_bridge.commands.install.subprocess.Popen")
    @patch("cockpit_apt_bridge.commands.install.os.pipe")
    @patch("cockpit_apt_bridge.commands.install.os.close")
    @patch("cockpit_apt_bridge.commands.install.os.fdopen")
    @patch("cockpit_apt_bridge.commands.install.select.select")
    @patch("builtins.print")
    def test_install_success(self, mock_print, mock_select, mock_fdopen, mock_close, mock_pipe, mock_popen):
        """Test successful package installation."""
        # Setup pipe mocks
        mock_pipe.return_value = (3, 4)

        # Create mock status file
        status_lines = [
            "pmstatus:nginx:25.0:Downloading nginx\n",
            "pmstatus:nginx:50.0:Unpacking nginx\n",
            "pmstatus:nginx:75.0:Setting up nginx\n",
        ]
        mock_status_file = Mock()
        mock_status_file.read.side_effect = status_lines + [""]
        mock_status_file.close = Mock()
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
        assert "install" in cmd
        assert "nginx" in cmd
        assert "-y" in cmd

        # Verify progress was printed
        assert mock_print.call_count >= 2  # At least progress + final

        # Verify file descriptor was closed
        mock_close.assert_called()

    @patch("cockpit_apt_bridge.commands.install.subprocess.Popen")
    @patch("cockpit_apt_bridge.commands.install.os.pipe")
    @patch("cockpit_apt_bridge.commands.install.os.close")
    @patch("cockpit_apt_bridge.commands.install.os.fdopen")
    @patch("cockpit_apt_bridge.commands.install.select.select")
    def test_install_package_not_found(self, mock_select, mock_fdopen, mock_close, mock_pipe, mock_popen):
        """Test installation of non-existent package."""
        # Setup mocks
        mock_pipe.return_value = (3, 4)
        mock_status_file = Mock()
        mock_status_file.read.return_value = ""
        mock_status_file.close = Mock()
        mock_status_file.close = Mock()
        mock_fdopen.return_value = mock_status_file
        mock_select.return_value = ([], [], [])

        # Setup process to fail with package not found
        mock_process = Mock()
        mock_process.poll.return_value = 100
        mock_process.returncode = 100
        mock_process.communicate.return_value = ("", "Unable to locate package nonexistent")
        mock_popen.return_value = mock_process

        # Execute and verify error
        with pytest.raises(PackageNotFoundError):
            execute("nonexistent")

    @patch("cockpit_apt_bridge.commands.install.subprocess.Popen")
    @patch("cockpit_apt_bridge.commands.install.os.pipe")
    @patch("cockpit_apt_bridge.commands.install.os.close")
    @patch("cockpit_apt_bridge.commands.install.os.fdopen")
    @patch("cockpit_apt_bridge.commands.install.select.select")
    def test_install_locked(self, mock_select, mock_fdopen, mock_close, mock_pipe, mock_popen):
        """Test installation when package manager is locked."""
        # Setup mocks
        mock_pipe.return_value = (3, 4)
        mock_status_file = Mock()
        mock_status_file.read.return_value = ""
        mock_status_file.close = Mock()
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

    @patch("cockpit_apt_bridge.commands.install.subprocess.Popen")
    @patch("cockpit_apt_bridge.commands.install.os.pipe")
    @patch("cockpit_apt_bridge.commands.install.os.close")
    @patch("cockpit_apt_bridge.commands.install.os.fdopen")
    @patch("cockpit_apt_bridge.commands.install.select.select")
    def test_install_disk_full(self, mock_select, mock_fdopen, mock_close, mock_pipe, mock_popen):
        """Test installation when disk is full."""
        # Setup mocks
        mock_pipe.return_value = (3, 4)
        mock_status_file = Mock()
        mock_status_file.read.return_value = ""
        mock_status_file.close = Mock()
        mock_fdopen.return_value = mock_status_file
        mock_select.return_value = ([], [], [])

        # Setup process to fail with disk full error
        mock_process = Mock()
        mock_process.poll.return_value = 100
        mock_process.returncode = 100
        mock_process.communicate.return_value = ("", "You don't have enough free space")
        mock_popen.return_value = mock_process

        # Execute and verify error
        with pytest.raises(APTBridgeError) as exc_info:
            execute("nginx")

        assert exc_info.value.code == "DISK_FULL"

    @patch("cockpit_apt_bridge.commands.install.subprocess.Popen")
    @patch("cockpit_apt_bridge.commands.install.os.pipe")
    @patch("cockpit_apt_bridge.commands.install.os.fdopen")
    @patch("cockpit_apt_bridge.commands.install.select.select")
    def test_install_generic_failure(self, mock_select, mock_fdopen, mock_pipe, mock_popen):
        """Test installation with generic failure."""
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

        assert exc_info.value.code == "INSTALL_FAILED"

    def test_install_invalid_package_name(self):
        """Test installation with invalid package name."""
        with pytest.raises(APTBridgeError):
            execute("../etc/passwd")

        with pytest.raises(APTBridgeError):
            execute("pkg;rm -rf /")

    @patch("cockpit_apt_bridge.commands.install.subprocess.Popen")
    @patch("cockpit_apt_bridge.commands.install.os.pipe")
    def test_install_exception_handling(self, mock_pipe, mock_popen):
        """Test exception handling during installation."""
        # Make pipe() raise exception
        mock_pipe.side_effect = Exception("Pipe creation failed")

        # Execute and verify error
        with pytest.raises(APTBridgeError) as exc_info:
            execute("nginx")

        assert exc_info.value.code == "INTERNAL_ERROR"

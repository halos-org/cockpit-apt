"""
Tests for shared apt progress utilities.

Tests parse_status_line() and run_apt_command() which are shared across
install, upgrade, and remove commands.
"""

import json
from typing import Any
from unittest.mock import Mock, patch

import pytest

from cockpit_apt.utils.apt_progress import parse_status_line, run_apt_command
from cockpit_apt.utils.errors import APTBridgeError


class TestParseStatusLine:
    """Test parse_status_line helper function."""

    def test_parse_pmstatus_line(self):
        line = "pmstatus:nginx:25.5:Installing nginx"
        result = parse_status_line(line)

        assert result is not None
        assert result["percentage"] == 25
        assert "nginx" in result["message"]

    def test_parse_dlstatus_line(self):
        line = "dlstatus:curl:50.0:Downloading curl"
        result = parse_status_line(line)

        assert result is not None
        assert result["percentage"] == 50
        assert "curl" in result["message"]

    def test_parse_line_with_colon_in_message(self):
        line = "pmstatus:vim:75.0:Setting up: vim"
        result = parse_status_line(line)

        assert result is not None
        assert result["percentage"] == 75
        assert ":" in result["message"]

    def test_parse_empty_message(self):
        line = "pmstatus:git:100.0:"
        result = parse_status_line(line)

        assert result is not None
        assert result["percentage"] == 100
        assert "git" in result["message"].lower()

    def test_parse_invalid_line(self):
        assert parse_status_line("") is None
        assert parse_status_line("invalid") is None
        assert parse_status_line("pmstatus:only:two") is None
        assert parse_status_line("unknown:pkg:50:msg") is None

    def test_parse_invalid_percentage(self):
        line = "pmstatus:pkg:invalid:message"
        result = parse_status_line(line)

        assert result is None


# Shared mock path prefix for run_apt_command internals
_MOD = "cockpit_apt.utils.apt_progress"


def _make_mocks(
    mock_popen: Mock,
    mock_pipe: Mock,
    mock_fdopen: Mock,
    mock_select: Mock,
    *,
    status_lines: list[str] | None = None,
    poll_sequence: list[int | None] | None = None,
    returncode: int = 0,
    stderr: str = "",
) -> Mock:
    """Set up standard mocks for run_apt_command tests."""
    mock_pipe.return_value = (3, 4)

    mock_status_file = Mock()
    if status_lines:
        mock_status_file.read.side_effect = status_lines + [""]
        mock_select.return_value = ([mock_status_file], [], [])
    else:
        mock_status_file.read.return_value = ""
        mock_select.return_value = ([], [], [])
    mock_status_file.close = Mock()
    mock_fdopen.return_value = mock_status_file

    mock_process = Mock()
    if poll_sequence:
        mock_process.poll.side_effect = poll_sequence
    else:
        mock_process.poll.return_value = returncode
    mock_process.returncode = returncode
    mock_process.communicate.return_value = ("", stderr)
    mock_popen.return_value = mock_process

    return mock_process


def _run_default(**kwargs: Any) -> None:
    """Call run_apt_command with sensible defaults, overridden by kwargs."""
    defaults: dict[str, Any] = {
        "cmd": ["apt-get", "test", "-y"],
        "monotonic_progress": True,
        "success_message": "Test complete",
        "success_result": {"success": True, "message": "Test complete"},
        "error_code": "TEST_FAILED",
        "error_message": "Test operation failed",
        "internal_error_message": "Error during test",
    }
    defaults.update(kwargs)
    run_apt_command(**defaults)


class TestRunAptCommand:
    """Test run_apt_command function."""

    @patch(f"{_MOD}.select.select")
    @patch(f"{_MOD}.os.fdopen")
    @patch(f"{_MOD}.os.close")
    @patch(f"{_MOD}.os.pipe")
    @patch(f"{_MOD}.subprocess.Popen")
    @patch("builtins.print")
    def test_success_with_progress(
        self, mock_print, mock_popen, mock_pipe, mock_close, mock_fdopen, mock_select
    ):
        """Test successful command with progress reporting."""
        _make_mocks(
            mock_popen,
            mock_pipe,
            mock_fdopen,
            mock_select,
            status_lines=[
                "pmstatus:pkg:25.0:Downloading\n",
                "pmstatus:pkg:50.0:Unpacking\n",
                "pmstatus:pkg:75.0:Setting up\n",
            ],
            poll_sequence=[None, None, None, 0],
        )

        _run_default()

        # Verify progress was printed
        printed = [json.loads(c[0][0]) for c in mock_print.call_args_list]
        progress_pcts = [p["percentage"] for p in printed if p.get("type") == "progress"]
        assert progress_pcts == [25, 50, 75, 100]

        # Verify final result was printed
        assert printed[-1] == {"success": True, "message": "Test complete"}

    @patch(f"{_MOD}.select.select")
    @patch(f"{_MOD}.os.fdopen")
    @patch(f"{_MOD}.os.close")
    @patch(f"{_MOD}.os.pipe")
    @patch(f"{_MOD}.subprocess.Popen")
    @patch("builtins.print")
    def test_monotonic_progress_filtering(
        self, mock_print, mock_popen, mock_pipe, mock_close, mock_fdopen, mock_select
    ):
        """Test that monotonic_progress=True filters non-increasing percentages."""
        _make_mocks(
            mock_popen,
            mock_pipe,
            mock_fdopen,
            mock_select,
            status_lines=[
                "pmstatus:pkg:50.0:Step 1\n",
                "pmstatus:pkg:25.0:Step 2 (reset)\n",
                "pmstatus:pkg:75.0:Step 3\n",
            ],
            poll_sequence=[None, None, None, 0],
        )

        _run_default(monotonic_progress=True)

        printed = [json.loads(c[0][0]) for c in mock_print.call_args_list]
        progress_pcts = [p["percentage"] for p in printed if p.get("type") == "progress"]
        # 25 is filtered out (not > 50), final 100 is appended
        assert progress_pcts == [50, 75, 100]

    @patch(f"{_MOD}.select.select")
    @patch(f"{_MOD}.os.fdopen")
    @patch(f"{_MOD}.os.close")
    @patch(f"{_MOD}.os.pipe")
    @patch(f"{_MOD}.subprocess.Popen")
    @patch("builtins.print")
    def test_non_monotonic_progress(
        self, mock_print, mock_popen, mock_pipe, mock_close, mock_fdopen, mock_select
    ):
        """Test that monotonic_progress=False reports all progress values."""
        _make_mocks(
            mock_popen,
            mock_pipe,
            mock_fdopen,
            mock_select,
            status_lines=[
                "pmstatus:pkg-a:50.0:Setting up pkg-a\n",
                "pmstatus:pkg-a:100.0:Installed pkg-a\n",
                "pmstatus:pkg-b:25.0:Unpacking pkg-b\n",
            ],
            poll_sequence=[None, None, None, 0],
        )

        _run_default(monotonic_progress=False)

        printed = [json.loads(c[0][0]) for c in mock_print.call_args_list]
        progress_pcts = [p["percentage"] for p in printed if p.get("type") == "progress"]
        # All values reported including non-monotonic 25, plus final 100
        assert progress_pcts == [50, 100, 25, 100]

    @patch(f"{_MOD}.select.select")
    @patch(f"{_MOD}.os.fdopen")
    @patch(f"{_MOD}.os.close")
    @patch(f"{_MOD}.os.pipe")
    @patch(f"{_MOD}.subprocess.Popen")
    def test_locked_error(self, mock_popen, mock_pipe, mock_close, mock_fdopen, mock_select):
        """Test LOCKED error classification."""
        _make_mocks(
            mock_popen, mock_pipe, mock_fdopen, mock_select,
            returncode=100, stderr="dpkg was interrupted",
        )

        with pytest.raises(APTBridgeError) as exc_info:
            _run_default()

        assert exc_info.value.code == "LOCKED"

    @patch(f"{_MOD}.select.select")
    @patch(f"{_MOD}.os.fdopen")
    @patch(f"{_MOD}.os.close")
    @patch(f"{_MOD}.os.pipe")
    @patch(f"{_MOD}.subprocess.Popen")
    def test_disk_full_error(self, mock_popen, mock_pipe, mock_close, mock_fdopen, mock_select):
        """Test DISK_FULL error classification."""
        _make_mocks(
            mock_popen, mock_pipe, mock_fdopen, mock_select,
            returncode=100, stderr="You don't have enough free space",
        )

        with pytest.raises(APTBridgeError) as exc_info:
            _run_default()

        assert exc_info.value.code == "DISK_FULL"

    @patch(f"{_MOD}.select.select")
    @patch(f"{_MOD}.os.fdopen")
    @patch(f"{_MOD}.os.close")
    @patch(f"{_MOD}.os.pipe")
    @patch(f"{_MOD}.subprocess.Popen")
    def test_generic_failure(self, mock_popen, mock_pipe, mock_close, mock_fdopen, mock_select):
        """Test generic failure uses provided error_code and error_message."""
        _make_mocks(
            mock_popen, mock_pipe, mock_fdopen, mock_select,
            returncode=1, stderr="Some error",
        )

        with pytest.raises(APTBridgeError) as exc_info:
            _run_default(error_code="INSTALL_FAILED", error_message="Failed to install")

        assert exc_info.value.code == "INSTALL_FAILED"
        assert "Failed to install" in str(exc_info.value)

    @patch(f"{_MOD}.select.select")
    @patch(f"{_MOD}.os.fdopen")
    @patch(f"{_MOD}.os.close")
    @patch(f"{_MOD}.os.pipe")
    @patch(f"{_MOD}.subprocess.Popen")
    def test_classify_error_callback(
        self, mock_popen, mock_pipe, mock_close, mock_fdopen, mock_select
    ):
        """Test that classify_error callback gets first crack at error classification."""
        _make_mocks(
            mock_popen, mock_pipe, mock_fdopen, mock_select,
            returncode=100, stderr="Unable to locate package foo",
        )

        def classify(stderr: str) -> APTBridgeError | None:
            if "Unable to locate package" in stderr:
                return APTBridgeError("Package not found", code="PACKAGE_NOT_FOUND")
            return None

        with pytest.raises(APTBridgeError) as exc_info:
            _run_default(classify_error=classify)

        assert exc_info.value.code == "PACKAGE_NOT_FOUND"

    @patch(f"{_MOD}.select.select")
    @patch(f"{_MOD}.os.fdopen")
    @patch(f"{_MOD}.os.close")
    @patch(f"{_MOD}.os.pipe")
    @patch(f"{_MOD}.subprocess.Popen")
    def test_classify_error_falls_through_to_common(
        self, mock_popen, mock_pipe, mock_close, mock_fdopen, mock_select
    ):
        """Test that classify_error returning None falls through to common errors."""
        _make_mocks(
            mock_popen, mock_pipe, mock_fdopen, mock_select,
            returncode=100, stderr="dpkg was interrupted",
        )

        def classify(stderr: str) -> APTBridgeError | None:
            return None  # Don't handle, fall through

        with pytest.raises(APTBridgeError) as exc_info:
            _run_default(classify_error=classify)

        assert exc_info.value.code == "LOCKED"

    @patch(f"{_MOD}.os.close")
    @patch(f"{_MOD}.os.pipe")
    @patch(f"{_MOD}.subprocess.Popen")
    def test_popen_failure_closes_both_fds(self, mock_popen, mock_pipe, mock_close):
        """Test that both pipe FDs are closed if Popen raises."""
        mock_pipe.return_value = (3, 4)
        mock_popen.side_effect = OSError("Failed to exec")

        with pytest.raises(APTBridgeError):
            _run_default()

        mock_close.assert_any_call(3)
        mock_close.assert_any_call(4)

    @patch(f"{_MOD}.os.pipe")
    def test_internal_error_wrapping(self, mock_pipe):
        """Test that unexpected exceptions are wrapped as INTERNAL_ERROR."""
        mock_pipe.side_effect = Exception("Pipe creation failed")

        with pytest.raises(APTBridgeError) as exc_info:
            _run_default(internal_error_message="Error during install")

        assert exc_info.value.code == "INTERNAL_ERROR"
        assert "Error during install" in str(exc_info.value)

    @patch(f"{_MOD}.select.select")
    @patch(f"{_MOD}.os.fdopen")
    @patch(f"{_MOD}.os.close")
    @patch(f"{_MOD}.os.pipe")
    @patch(f"{_MOD}.subprocess.Popen")
    @patch("builtins.print")
    def test_apt_command_constructed_correctly(
        self, mock_print, mock_popen, mock_pipe, mock_close, mock_fdopen, mock_select
    ):
        """Test that the apt-get command is passed through to Popen."""
        _make_mocks(mock_popen, mock_pipe, mock_fdopen, mock_select)

        cmd = ["apt-get", "install", "-y", "-o", "APT::Status-Fd=3", "nginx"]
        _run_default(cmd=cmd)

        call_args = mock_popen.call_args
        assert call_args[0][0] == cmd

    @patch(f"{_MOD}.select.select")
    @patch(f"{_MOD}.os.fdopen")
    @patch(f"{_MOD}.os.close")
    @patch(f"{_MOD}.os.pipe")
    @patch(f"{_MOD}.subprocess.Popen")
    @patch("builtins.print")
    def test_success_result_printed(
        self, mock_print, mock_popen, mock_pipe, mock_close, mock_fdopen, mock_select
    ):
        """Test that success_result is printed as final JSON line."""
        _make_mocks(mock_popen, mock_pipe, mock_fdopen, mock_select)

        result = {"success": True, "message": "Installed foo", "package_name": "foo"}
        _run_default(success_result=result)

        printed = [json.loads(c[0][0]) for c in mock_print.call_args_list]
        assert printed[-1] == result

"""
Unit tests for files command.
"""

import subprocess
from unittest.mock import MagicMock, patch

import pytest

from cockpit_apt.commands import files
from cockpit_apt.utils.errors import APTBridgeError, PackageNotFoundError


def test_files_success():
    """Test getting file list for an installed package."""
    mock_result = MagicMock()
    mock_result.stdout = """/usr/bin/nginx
/usr/sbin/nginx
/etc/nginx/nginx.conf
/var/log/nginx
/usr/share/doc/nginx"""
    mock_result.stderr = ""
    mock_result.returncode = 0

    with patch("subprocess.run", return_value=mock_result) as mock_run:
        result = files.execute("nginx")

    # Verify dpkg-query was called correctly
    mock_run.assert_called_once_with(
        ["dpkg-query", "-L", "nginx"], capture_output=True, text=True, check=True
    )

    # Check result
    assert isinstance(result, list)
    assert len(result) == 5
    assert "/usr/bin/nginx" in result
    assert "/usr/sbin/nginx" in result
    assert "/etc/nginx/nginx.conf" in result
    assert "/var/log/nginx" in result
    assert "/usr/share/doc/nginx" in result


def test_files_package_not_installed():
    """Test that package not installed raises PackageNotFoundError."""
    mock_error = subprocess.CalledProcessError(
        1,
        ["dpkg-query", "-L", "nonexistent"],
        stderr="dpkg-query: package 'nonexistent' is not installed",
    )

    with (
        patch("subprocess.run", side_effect=mock_error),
        pytest.raises(PackageNotFoundError) as exc_info,
    ):
        files.execute("nonexistent")

    assert exc_info.value.details == "nonexistent"
    assert "Package not found" in str(exc_info.value)


def test_files_invalid_package_name():
    """Test that invalid package name raises APTBridgeError."""
    with pytest.raises(APTBridgeError) as exc_info:
        files.execute("invalid@package!")

    assert "Invalid package name" in str(exc_info.value)


def test_files_empty_package_name():
    """Test that empty package name raises APTBridgeError."""
    with pytest.raises(APTBridgeError) as exc_info:
        files.execute("")

    assert "Package name cannot be empty" in str(exc_info.value)


def test_files_dpkg_query_error():
    """Test that dpkg-query errors are handled."""
    mock_error = subprocess.CalledProcessError(
        2, ["dpkg-query", "-L", "nginx"], stderr="dpkg-query: some other error"
    )

    with (
        patch("subprocess.run", side_effect=mock_error),
        pytest.raises(APTBridgeError) as exc_info,
    ):
        files.execute("nginx")

    assert "dpkg-query failed" in str(exc_info.value)
    assert "some other error" in exc_info.value.details


def test_files_with_trailing_whitespace():
    """Test that trailing whitespace in output is handled."""
    mock_result = MagicMock()
    mock_result.stdout = """/usr/bin/nginx
/usr/sbin/nginx
/etc/nginx/nginx.conf

/var/log/nginx
"""
    mock_result.stderr = ""
    mock_result.returncode = 0

    with patch("subprocess.run", return_value=mock_result):
        result = files.execute("nginx")

    # Check that empty lines and trailing whitespace are filtered
    assert isinstance(result, list)
    assert len(result) == 4
    assert all(line.strip() == line for line in result)
    assert "" not in result


def test_files_single_file_package():
    """Test package that installs only one file."""
    mock_result = MagicMock()
    mock_result.stdout = "/usr/bin/simple-tool"
    mock_result.stderr = ""
    mock_result.returncode = 0

    with patch("subprocess.run", return_value=mock_result):
        result = files.execute("simple-tool")

    assert isinstance(result, list)
    assert len(result) == 1
    assert result[0] == "/usr/bin/simple-tool"


def test_files_with_directories():
    """Test that directories are included in the file list."""
    mock_result = MagicMock()
    mock_result.stdout = """/usr
/usr/lib
/usr/lib/mypackage
/usr/lib/mypackage/file.so"""
    mock_result.stderr = ""
    mock_result.returncode = 0

    with patch("subprocess.run", return_value=mock_result):
        result = files.execute("mypackage")

    assert isinstance(result, list)
    assert len(result) == 4
    # Directories should be included
    assert "/usr" in result
    assert "/usr/lib" in result
    assert "/usr/lib/mypackage" in result
    assert "/usr/lib/mypackage/file.so" in result

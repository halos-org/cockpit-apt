"""
Unit tests for details command.
"""

from unittest.mock import MagicMock, patch

import pytest

from cockpit_apt_bridge.commands import details
from cockpit_apt_bridge.utils.errors import APTBridgeError, PackageNotFoundError
from tests.conftest import MockCache, MockPackage


def test_details_success(mock_apt_cache):
    """Test getting details for an existing package."""
    mock_apt = MagicMock()
    mock_apt.Cache = MagicMock(return_value=mock_apt_cache)
    with patch.dict("sys.modules", {"apt": mock_apt}):
        result = details.execute("nginx")

    assert result["name"] == "nginx"
    assert result["summary"] == "HTTP server"
    assert "Nginx is a web server" in result["description"]
    assert result["section"] == "web"
    assert result["installed"] is False
    assert result["candidateVersion"] == "1.18.0"
    assert result["installedVersion"] is None
    assert result["homepage"] == "https://nginx.org"
    assert result["priority"] == "optional"
    assert result["size"] == 1024
    assert result["installedSize"] == 4096


def test_details_installed_package(mock_apt_cache):
    """Test getting details for an installed package."""
    mock_apt = MagicMock()
    mock_apt.Cache = MagicMock(return_value=mock_apt_cache)
    with patch.dict("sys.modules", {"apt": mock_apt}):
        result = details.execute("python3")

    assert result["name"] == "python3"
    assert result["installed"] is True
    assert result["installedVersion"] == "3.11.2"
    assert result["candidateVersion"] == "3.11.2"


def test_details_with_dependencies(mock_apt_cache):
    """Test that dependencies are included in details."""
    mock_apt = MagicMock()
    mock_apt.Cache = MagicMock(return_value=mock_apt_cache)
    with patch.dict("sys.modules", {"apt": mock_apt}):
        result = details.execute("nginx")

    # nginx has 2 dependencies: libc6 and libssl3
    assert len(result["dependencies"]) == 2
    assert any(d["name"] == "libc6" for d in result["dependencies"])
    assert any(d["name"] == "libssl3" for d in result["dependencies"])

    # Check dependency structure
    libc6_dep = next(d for d in result["dependencies"] if d["name"] == "libc6")
    assert libc6_dep["relation"] == ">="
    assert libc6_dep["version"] == "2.34"


def test_details_with_reverse_dependencies(mock_apt_cache):
    """Test that reverse dependencies are included."""
    mock_apt = MagicMock()
    mock_apt.Cache = MagicMock(return_value=mock_apt_cache)
    with patch.dict("sys.modules", {"apt": mock_apt}):
        result = details.execute("libc6")

    # libc6 is depended upon by nginx and apache2 (from sample_packages)
    assert "reverseDependencies" in result
    assert isinstance(result["reverseDependencies"], list)
    # Should include packages that depend on libc6
    assert "nginx" in result["reverseDependencies"] or "apache2" in result["reverseDependencies"]


def test_details_package_not_found():
    """Test error when package doesn't exist."""
    empty_cache = MockCache([])

    mock_apt = MagicMock()
    mock_apt.Cache = MagicMock(return_value=empty_cache)
    with patch.dict("sys.modules", {"apt": mock_apt}):
        with pytest.raises(PackageNotFoundError) as exc_info:
            details.execute("nonexistent-package")

        assert exc_info.value.code == "PACKAGE_NOT_FOUND"
        assert "nonexistent-package" in str(exc_info.value)


def test_details_invalid_package_name():
    """Test validation of package name."""
    with pytest.raises(APTBridgeError) as exc_info:
        details.execute("../etc/passwd")

    assert exc_info.value.code == "INVALID_INPUT"


def test_details_empty_package_name():
    """Test validation rejects empty package name."""
    with pytest.raises(APTBridgeError) as exc_info:
        details.execute("")

    assert exc_info.value.code == "INVALID_INPUT"


def test_details_package_name_too_long():
    """Test validation rejects very long package names."""
    long_name = "a" * 256  # Exceeds 255 character limit

    with pytest.raises(APTBridgeError) as exc_info:
        details.execute(long_name)

    assert exc_info.value.code == "INVALID_INPUT"


def test_details_package_without_candidate():
    """Test handling of package with no candidate version."""
    pkg = MockPackage("broken-pkg")
    pkg.candidate = None
    broken_cache = MockCache([pkg])

    mock_apt = MagicMock()
    mock_apt.Cache = MagicMock(return_value=broken_cache)
    with patch.dict("sys.modules", {"apt": mock_apt}):
        result = details.execute("broken-pkg")

        # Should still return a result, but with empty/default values
        assert result["name"] == "broken-pkg"
        assert result["description"] == ""
        assert result["candidateVersion"] is None


def test_details_cache_error():
    """Test handling of cache loading errors."""
    mock_apt = MagicMock()
    mock_apt.Cache = MagicMock(side_effect=Exception("Cache error"))
    with patch.dict("sys.modules", {"apt": mock_apt}):
        with pytest.raises(APTBridgeError) as exc_info:
            details.execute("nginx")

        assert exc_info.value.code == "CACHE_ERROR"
        assert "Cache error" in str(exc_info.value.details)


def test_details_all_fields_present(mock_apt_cache):
    """Test that all required fields are present in output."""
    mock_apt = MagicMock()
    mock_apt.Cache = MagicMock(return_value=mock_apt_cache)
    with patch.dict("sys.modules", {"apt": mock_apt}):
        result = details.execute("nginx")

    required_fields = [
        "name",
        "summary",
        "description",
        "section",
        "installed",
        "installedVersion",
        "candidateVersion",
        "priority",
        "homepage",
        "maintainer",
        "size",
        "installedSize",
        "dependencies",
        "reverseDependencies",
    ]

    for field in required_fields:
        assert field in result, f"Missing required field: {field}"

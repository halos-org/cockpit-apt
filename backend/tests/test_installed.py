"""
Unit tests for list-installed and list-upgradable commands.
"""

from unittest.mock import MagicMock, patch

import pytest

from cockpit_apt_bridge.commands import list_installed, list_upgradable
from cockpit_apt_bridge.utils.errors import APTBridgeError
from tests.conftest import MockCache, MockPackage


def test_list_installed_success(mock_apt_cache):
    """Test listing installed packages."""
    mock_apt = MagicMock()
    mock_apt.Cache = MagicMock(return_value=mock_apt_cache)
    with patch.dict("sys.modules", {"apt": mock_apt}):
        result = list_installed.execute()

    # Should return only installed packages
    assert isinstance(result, list)
    assert len(result) > 0

    # All packages should be marked as installed in the test data
    # From sample_packages: nginx-common, python3, python3-apt, libc6, vim are installed
    assert len(result) == 5

    # Check that all returned packages are actually installed
    for pkg in result:
        # We can't check pkg["installed"] because the formatter doesn't include it
        # but we know these are the installed ones
        assert pkg["name"] in ["nginx-common", "python3", "python3-apt", "libc6", "vim"]

    # Should be sorted alphabetically
    names = [p["name"] for p in result]
    assert names == sorted(names)


def test_list_installed_includes_version(mock_apt_cache):
    """Test that installed version is included."""
    mock_apt = MagicMock()
    mock_apt.Cache = MagicMock(return_value=mock_apt_cache)
    with patch.dict("sys.modules", {"apt": mock_apt}):
        result = list_installed.execute()

    # All packages should have version field
    for pkg in result:
        assert "version" in pkg
        assert pkg["version"] != ""
        assert pkg["version"] != "unknown"


def test_list_installed_all_fields(mock_apt_cache):
    """Test that all required fields are present."""
    mock_apt = MagicMock()
    mock_apt.Cache = MagicMock(return_value=mock_apt_cache)
    with patch.dict("sys.modules", {"apt": mock_apt}):
        result = list_installed.execute()

    for pkg in result:
        assert "name" in pkg
        assert "version" in pkg
        assert "summary" in pkg
        assert "section" in pkg


def test_list_installed_empty_when_none_installed():
    """Test with no installed packages."""
    # Create cache with only non-installed packages
    packages = [
        MockPackage("pkg1", installed=False),
        MockPackage("pkg2", installed=False),
    ]
    cache = MockCache(packages)

    mock_apt = MagicMock()
    mock_apt.Cache = MagicMock(return_value=cache)
    with patch.dict("sys.modules", {"apt": mock_apt}):
        result = list_installed.execute()

    assert result == []


def test_list_installed_cache_error():
    """Test handling of cache errors."""
    mock_apt = MagicMock()
    mock_apt.Cache = MagicMock(side_effect=Exception("Cache error"))
    with patch.dict("sys.modules", {"apt": mock_apt}):
        with pytest.raises(APTBridgeError) as exc_info:
            list_installed.execute()

        assert exc_info.value.code == "CACHE_ERROR"


def test_list_upgradable_success(mock_apt_cache):
    """Test listing upgradable packages."""
    mock_apt = MagicMock()
    mock_apt.Cache = MagicMock(return_value=mock_apt_cache)
    with patch.dict("sys.modules", {"apt": mock_apt}):
        result = list_upgradable.execute()

    # Should return packages with upgrades available
    assert isinstance(result, list)

    # From sample_packages: only vim is_upgradable
    assert len(result) == 1
    assert result[0]["name"] == "vim"


def test_list_upgradable_versions(mock_apt_cache):
    """Test that both installed and candidate versions are included."""
    mock_apt = MagicMock()
    mock_apt.Cache = MagicMock(return_value=mock_apt_cache)
    with patch.dict("sys.modules", {"apt": mock_apt}):
        result = list_upgradable.execute()

    for pkg in result:
        assert "installedVersion" in pkg
        assert "candidateVersion" in pkg
        assert pkg["installedVersion"] != ""
        assert pkg["candidateVersion"] != ""


def test_list_upgradable_all_fields(mock_apt_cache):
    """Test that all required fields are present."""
    mock_apt = MagicMock()
    mock_apt.Cache = MagicMock(return_value=mock_apt_cache)
    with patch.dict("sys.modules", {"apt": mock_apt}):
        result = list_upgradable.execute()

    for pkg in result:
        assert "name" in pkg
        assert "installedVersion" in pkg
        assert "candidateVersion" in pkg
        assert "summary" in pkg


def test_list_upgradable_empty_when_up_to_date():
    """Test with no upgradable packages."""
    # Create cache with packages that are up-to-date
    packages = [
        MockPackage("pkg1", installed=True, is_upgradable=False),
        MockPackage("pkg2", installed=True, is_upgradable=False),
    ]
    cache = MockCache(packages)

    mock_apt = MagicMock()
    mock_apt.Cache = MagicMock(return_value=cache)
    with patch.dict("sys.modules", {"apt": mock_apt}):
        result = list_upgradable.execute()

    assert result == []


def test_list_upgradable_sorted(mock_apt_cache):
    """Test that results are sorted alphabetically."""
    # Add more upgradable packages
    packages = list(mock_apt_cache._packages)
    packages.append(MockPackage("zzz-pkg", installed=True, is_upgradable=True))
    packages.append(MockPackage("aaa-pkg", installed=True, is_upgradable=True))
    cache = MockCache(packages)

    mock_apt = MagicMock()
    mock_apt.Cache = MagicMock(return_value=cache)
    with patch.dict("sys.modules", {"apt": mock_apt}):
        result = list_upgradable.execute()

    names = [p["name"] for p in result]
    assert names == sorted(names)


def test_list_upgradable_cache_error():
    """Test handling of cache errors."""
    mock_apt = MagicMock()
    mock_apt.Cache = MagicMock(side_effect=Exception("Cache error"))
    with patch.dict("sys.modules", {"apt": mock_apt}):
        with pytest.raises(APTBridgeError) as exc_info:
            list_upgradable.execute()

        assert exc_info.value.code == "CACHE_ERROR"

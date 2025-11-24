"""
Unit tests for dependencies and reverse-dependencies commands.
"""

from unittest.mock import MagicMock, patch

import pytest

from cockpit_apt.commands import dependencies, reverse_dependencies
from cockpit_apt.utils.errors import APTBridgeError, PackageNotFoundError
from tests.conftest import MockCache, MockDependency, MockPackage


def test_dependencies_success(mock_apt_cache):
    """Test getting dependencies for a package."""
    mock_apt = MagicMock()
    mock_apt.Cache = MagicMock(return_value=mock_apt_cache)
    with patch.dict("sys.modules", {"apt": mock_apt}):
        result = dependencies.execute("nginx")

    # nginx has dependencies on libc6 and libssl3
    assert isinstance(result, list)
    assert len(result) == 2

    # Check dependency structure
    assert all("name" in dep for dep in result)
    assert all("relation" in dep for dep in result)
    assert all("version" in dep for dep in result)

    # Check specific dependencies
    assert any(d["name"] == "libc6" for d in result)
    assert any(d["name"] == "libssl3" for d in result)


def test_dependencies_with_version_constraints(mock_apt_cache):
    """Test that version constraints are included."""
    mock_apt = MagicMock()
    mock_apt.Cache = MagicMock(return_value=mock_apt_cache)
    with patch.dict("sys.modules", {"apt": mock_apt}):
        result = dependencies.execute("nginx")

    libc6_dep = next(d for d in result if d["name"] == "libc6")
    assert libc6_dep["relation"] == ">="
    assert libc6_dep["version"] == "2.34"


def test_dependencies_no_deps():
    """Test package with no dependencies."""
    pkg = MockPackage("standalone-pkg", dependencies=[])
    cache = MockCache([pkg])

    mock_apt = MagicMock()
    mock_apt.Cache = MagicMock(return_value=cache)
    with patch.dict("sys.modules", {"apt": mock_apt}):
        result = dependencies.execute("standalone-pkg")

    assert result == []


def test_dependencies_package_not_found():
    """Test error when package doesn't exist."""
    empty_cache = MockCache([])

    mock_apt = MagicMock()
    mock_apt.Cache = MagicMock(return_value=empty_cache)
    with patch.dict("sys.modules", {"apt": mock_apt}):
        with pytest.raises(PackageNotFoundError) as exc_info:
            dependencies.execute("nonexistent")

        assert exc_info.value.code == "PACKAGE_NOT_FOUND"


def test_dependencies_invalid_name():
    """Test validation of package name."""
    with pytest.raises(APTBridgeError) as exc_info:
        dependencies.execute("../etc/passwd")

    assert exc_info.value.code == "INVALID_INPUT"


def test_dependencies_empty_name():
    """Test validation rejects empty package name."""
    with pytest.raises(APTBridgeError) as exc_info:
        dependencies.execute("")

    assert exc_info.value.code == "INVALID_INPUT"


def test_dependencies_cache_error():
    """Test handling of cache errors."""
    mock_apt = MagicMock()
    mock_apt.Cache = MagicMock(side_effect=Exception("Cache error"))
    with patch.dict("sys.modules", {"apt": mock_apt}):
        with pytest.raises(APTBridgeError) as exc_info:
            dependencies.execute("nginx")

        assert exc_info.value.code == "CACHE_ERROR"


def test_reverse_dependencies_success(mock_apt_cache):
    """Test getting reverse dependencies for a package."""
    mock_apt = MagicMock()
    mock_apt.Cache = MagicMock(return_value=mock_apt_cache)
    with patch.dict("sys.modules", {"apt": mock_apt}):
        result = reverse_dependencies.execute("libc6")

    # libc6 is depended upon by nginx and apache2
    assert isinstance(result, list)
    assert len(result) >= 2

    # Should include nginx and apache2
    assert "nginx" in result or "apache2" in result


def test_reverse_dependencies_sorted(mock_apt_cache):
    """Test that results are sorted alphabetically."""
    mock_apt = MagicMock()
    mock_apt.Cache = MagicMock(return_value=mock_apt_cache)
    with patch.dict("sys.modules", {"apt": mock_apt}):
        result = reverse_dependencies.execute("libc6")

    assert result == sorted(result)


def test_reverse_dependencies_none():
    """Test package with no reverse dependencies."""
    # Create a package nothing depends on
    pkg1 = MockPackage("lonely-pkg", dependencies=[])
    pkg2 = MockPackage("other-pkg", dependencies=[])
    cache = MockCache([pkg1, pkg2])

    mock_apt = MagicMock()
    mock_apt.Cache = MagicMock(return_value=cache)
    with patch.dict("sys.modules", {"apt": mock_apt}):
        result = reverse_dependencies.execute("lonely-pkg")

    assert result == []


def test_reverse_dependencies_limit():
    """Test that results are limited to 50 packages."""
    # Create a very popular package with many dependents
    popular_pkg = MockPackage("popular")

    # Create 100 packages that all depend on popular_pkg
    packages = [popular_pkg]
    for i in range(100):
        pkg = MockPackage(f"dependent-{i:03d}", dependencies=[[MockDependency("popular")]])
        packages.append(pkg)

    cache = MockCache(packages)

    mock_apt = MagicMock()
    mock_apt.Cache = MagicMock(return_value=cache)
    with patch.dict("sys.modules", {"apt": mock_apt}):
        result = reverse_dependencies.execute("popular")

    # Should be limited to 50
    assert len(result) == 50


def test_reverse_dependencies_package_not_found():
    """Test error when package doesn't exist."""
    empty_cache = MockCache([])

    mock_apt = MagicMock()
    mock_apt.Cache = MagicMock(return_value=empty_cache)
    with patch.dict("sys.modules", {"apt": mock_apt}):
        with pytest.raises(PackageNotFoundError) as exc_info:
            reverse_dependencies.execute("nonexistent")

        assert exc_info.value.code == "PACKAGE_NOT_FOUND"


def test_reverse_dependencies_invalid_name():
    """Test validation of package name."""
    with pytest.raises(APTBridgeError) as exc_info:
        reverse_dependencies.execute("../etc/passwd")

    assert exc_info.value.code == "INVALID_INPUT"


def test_reverse_dependencies_cache_error():
    """Test handling of cache errors."""
    mock_apt = MagicMock()
    mock_apt.Cache = MagicMock(side_effect=Exception("Cache error"))
    with patch.dict("sys.modules", {"apt": mock_apt}):
        with pytest.raises(APTBridgeError) as exc_info:
            reverse_dependencies.execute("nginx")

        assert exc_info.value.code == "CACHE_ERROR"

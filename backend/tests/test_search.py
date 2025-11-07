"""
Unit tests for search command.
"""

import sys
from typing import Any
from unittest.mock import MagicMock, patch

import pytest

# Mock apt module for non-Linux systems
if sys.platform != "linux":
    sys.modules["apt"] = MagicMock()
    sys.modules["apt.package"] = MagicMock()

from cockpit_apt_bridge.commands import search
from cockpit_apt_bridge.utils.errors import APTBridgeError


class MockPackage:
    """Mock apt.Package for testing."""

    def __init__(
        self,
        name: str,
        summary: str = "Test package",
        version: str = "1.0.0",
        installed: bool = False,
        section: str = "utils",
    ):
        self.name = name
        self.is_installed = installed
        self.candidate = MagicMock()
        self.candidate.summary = summary
        self.candidate.version = version
        self.candidate.section = section
        self.installed = MagicMock() if installed else None
        if installed:
            self.installed.version = version


class MockCache:
    """Mock apt.Cache for testing."""

    def __init__(self, packages: list[MockPackage]):
        self._packages = packages

    def __iter__(self):
        return iter(self._packages)

    def __enter__(self):
        return self

    def __exit__(self, *args):
        pass


@pytest.fixture
def mock_apt_cache():
    """Fixture providing a mock APT cache with test packages."""
    packages = [
        MockPackage("nginx", "HTTP server", "1.18.0", False, "web"),
        MockPackage("nginx-common", "Nginx common files", "1.18.0", True, "web"),
        MockPackage("apache2", "Apache HTTP Server", "2.4.52", False, "web"),
        MockPackage("python3", "Python 3 interpreter", "3.11.2", True, "python"),
        MockPackage("python3-apt", "Python APT bindings", "2.4.0", True, "python"),
    ]
    return MockCache(packages)


def test_search_valid_query(mock_apt_cache):
    """Test search with valid query matching package names."""
    with patch("cockpit_apt_bridge.commands.search.apt.Cache", return_value=mock_apt_cache):
        results = search.execute("nginx")

    assert len(results) == 2
    assert results[0]["name"] == "nginx"
    assert results[1]["name"] == "nginx-common"
    assert results[0]["summary"] == "HTTP server"


def test_search_by_summary(mock_apt_cache):
    """Test search matching package summaries."""
    with patch("cockpit_apt_bridge.commands.search.apt.Cache", return_value=mock_apt_cache):
        results = search.execute("apache")

    assert len(results) == 1
    assert results[0]["name"] == "apache2"


def test_search_case_insensitive(mock_apt_cache):
    """Test search is case-insensitive."""
    with patch("cockpit_apt_bridge.commands.search.apt.Cache", return_value=mock_apt_cache):
        results_lower = search.execute("python")
        results_upper = search.execute("PYTHON")

    assert len(results_lower) == len(results_upper)
    assert results_lower[0]["name"] == results_upper[0]["name"]


def test_search_empty_results(mock_apt_cache):
    """Test search with no matching packages."""
    with patch("cockpit_apt_bridge.commands.search.apt.Cache", return_value=mock_apt_cache):
        results = search.execute("nonexistent")

    assert results == []


def test_search_query_too_short():
    """Test search rejects queries shorter than 2 characters."""
    with pytest.raises(APTBridgeError) as exc_info:
        search.execute("a")

    assert exc_info.value.code == "INVALID_QUERY"
    assert "at least 2 characters" in exc_info.value.message


def test_search_installed_status(mock_apt_cache):
    """Test search correctly identifies installed packages."""
    with patch("cockpit_apt_bridge.commands.search.apt.Cache", return_value=mock_apt_cache):
        results = search.execute("python3")

    # python3 and python3-apt are both installed
    installed = [r for r in results if r["installed"]]
    assert len(installed) == 2


def test_search_package_fields(mock_apt_cache):
    """Test search returns all required package fields."""
    with patch("cockpit_apt_bridge.commands.search.apt.Cache", return_value=mock_apt_cache):
        results = search.execute("nginx")

    pkg = results[0]
    assert "name" in pkg
    assert "summary" in pkg
    assert "version" in pkg
    assert "installed" in pkg
    assert "section" in pkg


def test_search_result_ordering(mock_apt_cache):
    """Test search prioritizes name matches over summary matches."""
    with patch("cockpit_apt_bridge.commands.search.apt.Cache", return_value=mock_apt_cache):
        # Search for "python" - should find python3 (name match) before
        # packages that only match in summary
        results = search.execute("python")

    # First results should be name matches
    assert results[0]["name"].startswith("python")


def test_search_handles_missing_candidate():
    """Test search handles packages with no candidate version."""
    packages = [
        MockPackage("test-pkg", "Test package", "1.0.0"),
    ]
    packages[0].candidate = None
    mock_cache = MockCache(packages)

    with patch("cockpit_apt_bridge.commands.search.apt.Cache", return_value=mock_cache):
        results = search.execute("test")

    # Should skip packages without candidates
    assert len(results) == 0


def test_search_result_limit():
    """Test search limits results to 100 packages."""
    # Create 150 packages matching the query
    packages = [MockPackage(f"test-pkg-{i}", f"Package {i}") for i in range(150)]
    mock_cache = MockCache(packages)

    with patch("cockpit_apt_bridge.commands.search.apt.Cache", return_value=mock_cache):
        results = search.execute("test")

    assert len(results) == 100


def test_search_apt_cache_error():
    """Test search handles APT cache errors gracefully."""
    with patch("cockpit_apt_bridge.commands.search.apt.Cache", side_effect=Exception("Cache error")):
        with pytest.raises(APTBridgeError) as exc_info:
            search.execute("nginx")

        assert exc_info.value.code == "APT_ERROR"
        assert "Cache error" in exc_info.value.details

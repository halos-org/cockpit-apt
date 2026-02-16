"""
Unit tests for filter-packages command.

Tests cascade filtering: repository → tab → search → limit
"""

from unittest.mock import MagicMock, patch

import pytest

from cockpit_apt.commands import filter_packages
from cockpit_apt.utils.errors import CacheError
from tests.conftest import MockCache, MockPackage


def test_filter_no_filters(mock_apt_cache):
    """Test filter with no filters returns all packages (limited)."""
    mock_apt = MagicMock()
    mock_apt.Cache = MagicMock(return_value=mock_apt_cache)
    with patch.dict("sys.modules", {"apt": mock_apt}):
        result = filter_packages.execute()

    assert len(result["packages"]) == 8  # All sample packages
    assert result["total_count"] == 8
    assert result["limited"] is False
    assert result["applied_filters"] == []
    assert result["limit"] == 1000


def test_filter_tab_installed(mock_apt_cache):
    """Test filtering by installed tab."""
    mock_apt = MagicMock()
    mock_apt.Cache = MagicMock(return_value=mock_apt_cache)
    with patch.dict("sys.modules", {"apt": mock_apt}):
        result = filter_packages.execute(tab="installed")

    # Should return: nginx-common, python3, python3-apt, libc6, vim (5 installed)
    assert result["total_count"] == 5
    assert len(result["packages"]) == 5
    assert "tab=installed" in result["applied_filters"]
    for pkg in result["packages"]:
        assert pkg["installed"] is True


def test_filter_tab_upgradable(mock_apt_cache):
    """Test filtering by upgradable tab."""
    mock_apt = MagicMock()
    mock_apt.Cache = MagicMock(return_value=mock_apt_cache)
    with patch.dict("sys.modules", {"apt": mock_apt}):
        result = filter_packages.execute(tab="upgradable")

    # Should return: vim (1 upgradable)
    assert result["total_count"] == 1
    assert len(result["packages"]) == 1
    assert result["packages"][0]["name"] == "vim"
    assert "tab=upgradable" in result["applied_filters"]


def test_filter_search_query(mock_apt_cache):
    """Test filtering by search query."""
    mock_apt = MagicMock()
    mock_apt.Cache = MagicMock(return_value=mock_apt_cache)
    with patch.dict("sys.modules", {"apt": mock_apt}):
        result = filter_packages.execute(search_query="python")

    # Should match: python3, python3-apt
    assert result["total_count"] == 2
    assert "search=python" in result["applied_filters"]
    package_names = [pkg["name"] for pkg in result["packages"]]
    assert "python3" in package_names
    assert "python3-apt" in package_names


def test_filter_search_case_insensitive(mock_apt_cache):
    """Test search is case-insensitive."""
    mock_apt = MagicMock()
    mock_apt.Cache = MagicMock(return_value=mock_apt_cache)
    with patch.dict("sys.modules", {"apt": mock_apt}):
        result_lower = filter_packages.execute(search_query="nginx")
        result_upper = filter_packages.execute(search_query="NGINX")

    assert result_lower["total_count"] == result_upper["total_count"]


def test_filter_search_by_summary(mock_apt_cache):
    """Test search matches package summaries."""
    mock_apt = MagicMock()
    mock_apt.Cache = MagicMock(return_value=mock_apt_cache)
    with patch.dict("sys.modules", {"apt": mock_apt}):
        result = filter_packages.execute(search_query="editor")

    # Should match: vim (Vi editor), emacs (editor)
    assert result["total_count"] >= 2
    package_names = [pkg["name"] for pkg in result["packages"]]
    assert "vim" in package_names
    assert "emacs" in package_names


def test_filter_tab_and_search(mock_apt_cache):
    """Test combining tab and search filters."""
    mock_apt = MagicMock()
    mock_apt.Cache = MagicMock(return_value=mock_apt_cache)
    with patch.dict("sys.modules", {"apt": mock_apt}):
        result = filter_packages.execute(tab="installed", search_query="python")

    # Should return installed packages matching "python": python3, python3-apt
    assert result["total_count"] == 2
    assert "tab=installed" in result["applied_filters"]
    assert "search=python" in result["applied_filters"]
    for pkg in result["packages"]:
        assert pkg["installed"] is True
        assert "python" in pkg["name"].lower()


def test_filter_repository_filter(mock_apt_cache):
    """Test filtering by repository."""
    # Mock package_matches_repository to simulate repository filtering
    def mock_repo_match(pkg, repo_id):
        # Simulate: nginx packages from "debian-security:stable"
        return pkg.name in ["nginx", "nginx-common"] and repo_id == "debian-security:stable"

    mock_apt = MagicMock()
    mock_apt.Cache = MagicMock(return_value=mock_apt_cache)

    with patch.dict("sys.modules", {"apt": mock_apt}):
        with patch("cockpit_apt.commands.filter_packages.package_matches_repository", side_effect=mock_repo_match):
            result = filter_packages.execute(repository_id="debian-security:stable")

    assert result["total_count"] == 2
    assert "repository=debian-security:stable" in result["applied_filters"]
    package_names = [pkg["name"] for pkg in result["packages"]]
    assert "nginx" in package_names
    assert "nginx-common" in package_names


def test_filter_repo_and_tab_and_search(mock_apt_cache):
    """Test combining repository, tab, and search filters."""
    def mock_repo_match(pkg, repo_id):
        return pkg.name in ["nginx", "nginx-common"] and repo_id == "test-repo:stable"

    mock_apt = MagicMock()
    mock_apt.Cache = MagicMock(return_value=mock_apt_cache)

    with patch.dict("sys.modules", {"apt": mock_apt}):
        with patch("cockpit_apt.commands.filter_packages.package_matches_repository", side_effect=mock_repo_match):
            result = filter_packages.execute(
                repository_id="test-repo:stable",
                tab="installed",
                search_query="nginx"
            )

    # Should return: nginx-common (from test-repo, installed, matching "nginx")
    assert result["total_count"] == 1
    assert result["packages"][0]["name"] == "nginx-common"
    assert "repository=test-repo:stable" in result["applied_filters"]
    assert "tab=installed" in result["applied_filters"]
    assert "search=nginx" in result["applied_filters"]


def test_filter_result_limit():
    """Test result limiting works correctly."""
    # Create many packages to test limit
    many_packages = [
        MockPackage(f"pkg{i}", summary=f"Package {i}", version="1.0.0")
        for i in range(100)
    ]
    cache = MockCache(many_packages)

    mock_apt = MagicMock()
    mock_apt.Cache = MagicMock(return_value=cache)

    with patch.dict("sys.modules", {"apt": mock_apt}):
        result = filter_packages.execute(limit=10)

    assert len(result["packages"]) == 10
    assert result["total_count"] == 100
    assert result["limited"] is True
    assert result["limit"] == 10


def test_filter_custom_limit(mock_apt_cache):
    """Test custom limit parameter."""
    mock_apt = MagicMock()
    mock_apt.Cache = MagicMock(return_value=mock_apt_cache)

    with patch.dict("sys.modules", {"apt": mock_apt}):
        result = filter_packages.execute(limit=3)

    assert len(result["packages"]) <= 3
    assert result["limit"] == 3


def test_filter_empty_results(mock_apt_cache):
    """Test filtering with no matching packages."""
    mock_apt = MagicMock()
    mock_apt.Cache = MagicMock(return_value=mock_apt_cache)

    with patch.dict("sys.modules", {"apt": mock_apt}):
        result = filter_packages.execute(search_query="nonexistent")

    assert result["total_count"] == 0
    assert result["packages"] == []
    assert result["limited"] is False


def test_filter_invalid_tab():
    """Test error on invalid tab parameter."""
    mock_apt = MagicMock()
    mock_apt.Cache = MagicMock(return_value=MockCache([]))

    with patch.dict("sys.modules", {"apt": mock_apt}):
        with pytest.raises(CacheError) as exc_info:
            filter_packages.execute(tab="invalid")

    assert "Invalid tab filter" in str(exc_info.value)


def test_filter_skips_packages_without_candidate():
    """Test that packages without candidate version are skipped."""
    # Create package without candidate
    pkg_without_candidate = MockPackage("broken-pkg")
    pkg_without_candidate.candidate = None

    cache = MockCache([pkg_without_candidate])
    mock_apt = MagicMock()
    mock_apt.Cache = MagicMock(return_value=cache)

    with patch.dict("sys.modules", {"apt": mock_apt}):
        result = filter_packages.execute()

    assert result["total_count"] == 0
    assert len(result["packages"]) == 0


def test_filter_package_fields(mock_apt_cache):
    """Test that packages have all required fields."""
    mock_apt = MagicMock()
    mock_apt.Cache = MagicMock(return_value=mock_apt_cache)

    with patch.dict("sys.modules", {"apt": mock_apt}):
        result = filter_packages.execute(limit=1)

    pkg = result["packages"][0]
    assert "name" in pkg
    assert "summary" in pkg
    assert "version" in pkg
    assert "installed" in pkg
    assert "section" in pkg


def test_filter_response_structure(mock_apt_cache):
    """Test response has correct structure."""
    mock_apt = MagicMock()
    mock_apt.Cache = MagicMock(return_value=mock_apt_cache)

    with patch.dict("sys.modules", {"apt": mock_apt}):
        result = filter_packages.execute()

    assert "packages" in result
    assert "total_count" in result
    assert "applied_filters" in result
    assert "limit" in result
    assert "limited" in result
    assert "apt_lists_populated" in result
    assert isinstance(result["packages"], list)
    assert isinstance(result["total_count"], int)
    assert isinstance(result["applied_filters"], list)
    assert isinstance(result["limited"], bool)
    assert isinstance(result["apt_lists_populated"], bool)


def test_apt_lists_populated_true(mock_apt_cache, tmp_path):
    """Test apt_lists_populated is True when _Packages files exist."""
    lists_dir = tmp_path / "lists"
    lists_dir.mkdir()
    (lists_dir / "archive.ubuntu.com_ubuntu_dists_jammy_main_binary-amd64_Packages").touch()

    mock_apt = MagicMock()
    mock_apt.Cache = MagicMock(return_value=mock_apt_cache)

    with patch.dict("sys.modules", {"apt": mock_apt}):
        with patch.object(filter_packages, "APT_LISTS_DIR", lists_dir):
            result = filter_packages.execute()

    assert result["apt_lists_populated"] is True


def test_apt_lists_populated_true_compressed(mock_apt_cache, tmp_path):
    """Test apt_lists_populated is True when compressed _Packages.gz files exist."""
    lists_dir = tmp_path / "lists"
    lists_dir.mkdir()
    (lists_dir / "archive.ubuntu.com_ubuntu_dists_jammy_main_binary-amd64_Packages.gz").touch()

    mock_apt = MagicMock()
    mock_apt.Cache = MagicMock(return_value=mock_apt_cache)

    with patch.dict("sys.modules", {"apt": mock_apt}):
        with patch.object(filter_packages, "APT_LISTS_DIR", lists_dir):
            result = filter_packages.execute()

    assert result["apt_lists_populated"] is True


def test_apt_lists_populated_false_empty_dir(mock_apt_cache, tmp_path):
    """Test apt_lists_populated is False when no _Packages files exist."""
    lists_dir = tmp_path / "lists"
    lists_dir.mkdir()
    # Create a non-Packages file (lock file, partial, etc.)
    (lists_dir / "lock").touch()

    mock_apt = MagicMock()
    mock_apt.Cache = MagicMock(return_value=mock_apt_cache)

    with patch.dict("sys.modules", {"apt": mock_apt}):
        with patch.object(filter_packages, "APT_LISTS_DIR", lists_dir):
            result = filter_packages.execute()

    assert result["apt_lists_populated"] is False


def test_apt_lists_populated_false_no_dir(mock_apt_cache, tmp_path):
    """Test apt_lists_populated is False when lists directory doesn't exist."""
    nonexistent_dir = tmp_path / "nonexistent"

    mock_apt = MagicMock()
    mock_apt.Cache = MagicMock(return_value=mock_apt_cache)

    with patch.dict("sys.modules", {"apt": mock_apt}):
        with patch.object(filter_packages, "APT_LISTS_DIR", nonexistent_dir):
            result = filter_packages.execute()

    assert result["apt_lists_populated"] is False

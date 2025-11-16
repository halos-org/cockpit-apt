"""
Unit tests for list-packages-by-category command.
"""

from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest

from cockpit_apt_bridge.commands import list_packages_by_category
from cockpit_apt_bridge.utils.errors import APTBridgeError
from tests.conftest import MockCache, MockPackage


@pytest.fixture
def categorized_packages():
    """Fixture providing packages with various category tags."""
    packages = []

    # Navigation category
    packages.append(
        MockPackage(
            "opencpn-container",
            summary="Open source chart plotter",
            version="5.10.2-1",
            section="graphics",
            installed=False,
        )
    )
    packages[-1].candidate.record["Tag"] = "category::navigation, category::chartplotters"

    packages.append(
        MockPackage(
            "avnav-container",
            summary="Touch-optimized chart plotter",
            version="20240520-1",
            section="graphics",
            installed=True,
        )
    )
    packages[-1].candidate.record["Tag"] = "category::navigation, category::chartplotters"

    # Monitoring category
    packages.append(
        MockPackage(
            "signalk-server-container",
            summary="Marine data server",
            version="2.0.0-1",
            section="net",
            installed=False,
        )
    )
    packages[-1].candidate.record["Tag"] = "category::monitoring, category::communication"

    packages.append(
        MockPackage(
            "influxdb-container",
            summary="Time series database",
            version="2.7.0-1",
            section="database",
            installed=True,
        )
    )
    packages[-1].candidate.record["Tag"] = "category::monitoring"

    # No category tags
    packages.append(
        MockPackage(
            "nginx",
            summary="HTTP server",
            version="1.18.0",
            section="web",
            installed=False,
        )
    )
    packages[-1].candidate.record["Tag"] = "role::server"

    return packages


@pytest.fixture
def mock_cache_categorized(categorized_packages):
    """Fixture providing a mock APT cache with categorized packages."""
    return MockCache(categorized_packages)


def test_list_packages_by_category_success(mock_cache_categorized):
    """Test listing packages in a specific category."""
    mock_apt = MagicMock()
    mock_apt.Cache = MagicMock(return_value=mock_cache_categorized)
    with patch.dict("sys.modules", {"apt": mock_apt}):
        result = list_packages_by_category.execute("navigation")

    # Should return list of packages
    assert isinstance(result, list)
    assert len(result) == 2  # opencpn and avnav

    # All packages should have the navigation category
    for pkg in result:
        assert "name" in pkg
        assert "summary" in pkg
        assert "version" in pkg
        assert "installed" in pkg
        assert "section" in pkg

    # Should be sorted alphabetically
    names = [p["name"] for p in result]
    assert names == sorted(names)

    # Check specific packages
    assert any(p["name"] == "opencpn-container" for p in result)
    assert any(p["name"] == "avnav-container" for p in result)


def test_list_packages_by_category_installed_flag(mock_cache_categorized):
    """Test that installed flag is correctly set."""
    mock_apt = MagicMock()
    mock_apt.Cache = MagicMock(return_value=mock_cache_categorized)
    with patch.dict("sys.modules", {"apt": mock_apt}):
        result = list_packages_by_category.execute("navigation")

    # avnav is installed, opencpn is not
    avnav = next(p for p in result if p["name"] == "avnav-container")
    assert avnav["installed"] is True

    opencpn = next(p for p in result if p["name"] == "opencpn-container")
    assert opencpn["installed"] is False


def test_list_packages_by_category_multiple_categories(mock_cache_categorized):
    """Test packages that have multiple category tags."""
    mock_apt = MagicMock()
    mock_apt.Cache = MagicMock(return_value=mock_cache_categorized)
    with patch.dict("sys.modules", {"apt": mock_apt}):
        # Both opencpn and avnav have both navigation and chartplotters
        nav_result = list_packages_by_category.execute("navigation")
        chart_result = list_packages_by_category.execute("chartplotters")

    # Should return same packages for both categories
    assert len(nav_result) == 2
    assert len(chart_result) == 2

    nav_names = {p["name"] for p in nav_result}
    chart_names = {p["name"] for p in chart_result}
    assert nav_names == chart_names


def test_list_packages_by_category_monitoring(mock_cache_categorized):
    """Test listing monitoring category packages."""
    mock_apt = MagicMock()
    mock_apt.Cache = MagicMock(return_value=mock_cache_categorized)
    with patch.dict("sys.modules", {"apt": mock_apt}):
        result = list_packages_by_category.execute("monitoring")

    # signalk and influxdb both have monitoring category
    assert len(result) == 2

    names = {p["name"] for p in result}
    assert "signalk-server-container" in names
    assert "influxdb-container" in names


def test_list_packages_by_category_empty_category(mock_cache_categorized):
    """Test listing a category with no packages."""
    mock_apt = MagicMock()
    mock_apt.Cache = MagicMock(return_value=mock_cache_categorized)
    with patch.dict("sys.modules", {"apt": mock_apt}):
        result = list_packages_by_category.execute("nonexistent-category")

    # Should return empty list, not error
    assert result == []


def test_list_packages_by_category_empty_string():
    """Test validation rejects empty category ID."""
    with pytest.raises(APTBridgeError) as exc_info:
        list_packages_by_category.execute("")

    assert exc_info.value.code == "INVALID_CATEGORY"


def test_list_packages_by_category_whitespace_only():
    """Test validation rejects whitespace-only category ID."""
    with pytest.raises(APTBridgeError) as exc_info:
        list_packages_by_category.execute("   ")

    assert exc_info.value.code == "INVALID_CATEGORY"


def test_list_packages_by_category_with_store_filter(mock_cache_categorized, tmp_path):
    """Test listing packages filtered by store."""
    # Add field::marine tag to some packages for filtering
    for pkg in mock_cache_categorized:
        if pkg.name in ["opencpn-container", "avnav-container", "signalk-server-container"]:
            current_tags = pkg.candidate.record.get("Tag", "")
            pkg.candidate.record["Tag"] = f"{current_tags}, field::marine"

    # Create a test store config
    store_config_dir = tmp_path / "stores"
    store_config_dir.mkdir()

    store_file = store_config_dir / "marine.yaml"
    store_file.write_text(
        """
id: marine
name: Marine Apps
description: Marine applications
filters:
  include_tags:
    - field::marine
  include_origins: []
  include_sections: []
  include_packages: []
"""
    )

    mock_apt = MagicMock()
    mock_apt.Cache = MagicMock(return_value=mock_cache_categorized)

    with patch.dict("sys.modules", {"apt": mock_apt}):
        with patch(
            "cockpit_apt_bridge.commands.list_packages_by_category.load_stores"
        ) as mock_load_stores:
            from cockpit_apt_bridge.utils.store_config import load_stores as real_load_stores

            mock_load_stores.return_value = real_load_stores(store_config_dir)

            result = list_packages_by_category.execute("monitoring", store_id="marine")

    # Only signalk should match (has monitoring + field::marine)
    # influxdb has monitoring but not field::marine, so filtered out
    assert len(result) == 1
    assert result[0]["name"] == "signalk-server-container"


def test_list_packages_by_category_store_not_found(mock_cache_categorized):
    """Test error handling when store ID doesn't exist."""
    mock_apt = MagicMock()
    mock_apt.Cache = MagicMock(return_value=mock_cache_categorized)

    with patch.dict("sys.modules", {"apt": mock_apt}):
        with patch(
            "cockpit_apt_bridge.commands.list_packages_by_category.load_stores"
        ) as mock_load:
            mock_load.return_value = []  # No stores available

            with pytest.raises(APTBridgeError) as exc_info:
                list_packages_by_category.execute("navigation", store_id="nonexistent")

            assert exc_info.value.code == "STORE_NOT_FOUND"
            assert "nonexistent" in str(exc_info.value.message)


def test_list_packages_by_category_packages_without_candidate():
    """Test handling of packages without candidate version."""
    pkg = MockPackage("test-pkg", version="1.0", section="utils")
    pkg.candidate = None  # No candidate version

    cache = MockCache([pkg])
    mock_apt = MagicMock()
    mock_apt.Cache = MagicMock(return_value=cache)

    with patch.dict("sys.modules", {"apt": mock_apt}):
        result = list_packages_by_category.execute("navigation")

    # Should handle gracefully and return empty list
    assert result == []


def test_list_packages_by_category_cache_error():
    """Test handling of cache errors."""
    mock_apt = MagicMock()
    mock_apt.Cache = MagicMock(side_effect=Exception("Cache error"))
    with patch.dict("sys.modules", {"apt": mock_apt}):
        with pytest.raises(APTBridgeError) as exc_info:
            list_packages_by_category.execute("navigation")

        assert exc_info.value.code == "CACHE_ERROR"


def test_list_packages_by_category_all_fields(mock_cache_categorized):
    """Test that all required package fields are present."""
    mock_apt = MagicMock()
    mock_apt.Cache = MagicMock(return_value=mock_cache_categorized)
    with patch.dict("sys.modules", {"apt": mock_apt}):
        result = list_packages_by_category.execute("navigation")

    # Check all packages have required fields
    for pkg in result:
        assert "name" in pkg
        assert "summary" in pkg
        assert "version" in pkg
        assert "installed" in pkg
        assert "section" in pkg
        # Should be basic package format, not details


def test_list_packages_by_category_case_sensitive():
    """Test that category matching is case-sensitive."""
    pkg = MockPackage("test-pkg", summary="Test", version="1.0", section="utils")
    pkg.candidate.record["Tag"] = "category::Navigation"  # Capital N

    cache = MockCache([pkg])
    mock_apt = MagicMock()
    mock_apt.Cache = MagicMock(return_value=cache)

    with patch.dict("sys.modules", {"apt": mock_apt}):
        # Searching for lowercase "navigation" should not match
        result = list_packages_by_category.execute("navigation")
        assert len(result) == 0

        # Searching for "Navigation" should match
        result = list_packages_by_category.execute("Navigation")
        assert len(result) == 1
        assert result[0]["name"] == "test-pkg"


def test_list_packages_by_category_empty_cache():
    """Test with empty APT cache."""
    empty_cache = MockCache([])

    mock_apt = MagicMock()
    mock_apt.Cache = MagicMock(return_value=empty_cache)
    with patch.dict("sys.modules", {"apt": mock_apt}):
        result = list_packages_by_category.execute("navigation")

    assert result == []

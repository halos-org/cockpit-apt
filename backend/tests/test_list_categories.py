"""
Unit tests for list-categories command.
"""

from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest

from cockpit_apt_bridge.commands import list_categories
from cockpit_apt_bridge.utils.errors import APTBridgeError
from tests.conftest import MockCache, MockPackage


@pytest.fixture
def marine_packages():
    """Fixture providing marine-themed test packages with category tags."""
    packages = []

    # Navigation packages
    packages.append(
        MockPackage(
            "opencpn-container",
            summary="Open source chart plotter",
            version="5.10.2-1",
            section="graphics",
        )
    )
    packages[-1].candidate.record["Tag"] = (
        "role::container-app, field::marine, field::navigation, "
        "category::navigation, category::chartplotters"
    )

    packages.append(
        MockPackage(
            "avnav-container",
            summary="Touch-optimized chart plotter",
            version="20240520-1",
            section="graphics",
        )
    )
    packages[-1].candidate.record["Tag"] = (
        "role::container-app, field::marine, field::navigation, "
        "category::navigation, category::chartplotters"
    )

    # Monitoring packages
    packages.append(
        MockPackage(
            "signalk-server-container",
            summary="Marine data server",
            version="2.0.0-1",
            section="net",
        )
    )
    packages[-1].candidate.record["Tag"] = (
        "role::container-app, field::marine, "
        "category::communication, category::monitoring"
    )

    packages.append(
        MockPackage(
            "influxdb-container",
            summary="Time series database",
            version="2.7.0-1",
            section="database",
        )
    )
    packages[-1].candidate.record["Tag"] = "role::container-app, category::monitoring"

    packages.append(
        MockPackage(
            "grafana-container",
            summary="Monitoring and visualization",
            version="10.0.0-1",
            section="net",
        )
    )
    packages[-1].candidate.record["Tag"] = (
        "role::container-app, category::visualization, category::monitoring"
    )

    # Package without category tags
    packages.append(
        MockPackage(
            "nginx",
            summary="HTTP server",
            version="1.18.0",
            section="web",
        )
    )
    packages[-1].candidate.record["Tag"] = "role::server, interface::web"

    return packages


@pytest.fixture
def mock_cache_with_categories(marine_packages):
    """Fixture providing a mock APT cache with categorized packages."""
    return MockCache(marine_packages)


def test_list_categories_success(mock_cache_with_categories):
    """Test listing all categories from packages."""
    mock_apt = MagicMock()
    mock_apt.Cache = MagicMock(return_value=mock_cache_with_categories)
    with patch.dict("sys.modules", {"apt": mock_apt}):
        result = list_categories.execute()

    # Should return a list
    assert isinstance(result, list)
    assert len(result) > 0

    # Each category should have required fields
    for category in result:
        assert "id" in category
        assert "label" in category
        assert "icon" in category
        assert "description" in category
        assert "count" in category
        assert isinstance(category["count"], int)
        assert category["count"] > 0

    # Should be sorted alphabetically by label
    labels = [c["label"] for c in result]
    assert labels == sorted(labels)


def test_list_categories_counts_correct(mock_cache_with_categories):
    """Test that package counts per category are correct."""
    mock_apt = MagicMock()
    mock_apt.Cache = MagicMock(return_value=mock_cache_with_categories)
    with patch.dict("sys.modules", {"apt": mock_apt}):
        result = list_categories.execute()

    # From marine_packages:
    # navigation: 2 packages (opencpn, avnav)
    # chartplotters: 2 packages (opencpn, avnav)
    # monitoring: 3 packages (signalk, influxdb, grafana)
    # communication: 1 package (signalk)
    # visualization: 1 package (grafana)

    category_dict = {c["id"]: c for c in result}

    assert category_dict["navigation"]["count"] == 2
    assert category_dict["chartplotters"]["count"] == 2
    assert category_dict["monitoring"]["count"] == 3
    assert category_dict["communication"]["count"] == 1
    assert category_dict["visualization"]["count"] == 1


def test_list_categories_auto_derived_labels(mock_cache_with_categories):
    """Test that labels are auto-derived from category IDs."""
    mock_apt = MagicMock()
    mock_apt.Cache = MagicMock(return_value=mock_cache_with_categories)
    with patch.dict("sys.modules", {"apt": mock_apt}):
        result = list_categories.execute()

    category_dict = {c["id"]: c for c in result}

    # Labels should be title-cased versions of IDs
    assert category_dict["navigation"]["label"] == "Navigation"
    assert category_dict["chartplotters"]["label"] == "Chartplotters"
    assert category_dict["monitoring"]["label"] == "Monitoring"


def test_list_categories_no_metadata_by_default(mock_cache_with_categories):
    """Test that icon and description are None when no metadata provided."""
    mock_apt = MagicMock()
    mock_apt.Cache = MagicMock(return_value=mock_cache_with_categories)
    with patch.dict("sys.modules", {"apt": mock_apt}):
        result = list_categories.execute()

    # Without store config, icon and description should be None
    for category in result:
        assert category["icon"] is None
        assert category["description"] is None


def test_list_categories_with_store_filter(mock_cache_with_categories, tmp_path):
    """Test listing categories filtered by store."""
    # Create a test store config
    store_config_dir = tmp_path / "stores"
    store_config_dir.mkdir()

    store_file = store_config_dir / "marine.yaml"
    store_file.write_text(
        """
id: marine
name: Marine Apps
description: Marine navigation and monitoring applications
filters:
  include_tags:
    - field::marine
  include_origins: []
  include_sections: []
  include_packages: []
category_metadata:
  - id: navigation
    label: "Navigation & Charts"
    icon: "compass"
    description: "Chart plotting and navigation tools"
  - id: chartplotters
    label: "Chart Plotters"
    icon: "map"
"""
    )

    mock_apt = MagicMock()
    mock_apt.Cache = MagicMock(return_value=mock_cache_with_categories)

    with patch.dict("sys.modules", {"apt": mock_apt}):
        with patch(
            "cockpit_apt_bridge.commands.list_categories.load_stores"
        ) as mock_load_stores:
            # Mock load_stores to use our test config
            from cockpit_apt_bridge.utils.store_config import load_stores as real_load_stores

            mock_load_stores.return_value = real_load_stores(store_config_dir)

            result = list_categories.execute(store_id="marine")

    # Should only include categories from marine packages (field::marine tag)
    # From our test data: navigation, chartplotters, communication, monitoring
    # (influxdb and grafana don't have field::marine, so filtered out)
    category_ids = {c["id"] for c in result}
    assert "navigation" in category_ids
    assert "chartplotters" in category_ids
    assert "communication" in category_ids
    # monitoring should still appear (from signalk which has field::marine)
    assert "monitoring" in category_ids
    # visualization should NOT appear (only grafana has it, which lacks field::marine)
    assert "visualization" not in category_ids


def test_list_categories_with_metadata_enhancement(mock_cache_with_categories, tmp_path):
    """Test that category metadata enhances auto-discovered categories."""
    # Create a test store config with metadata
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
    - role::container-app
  include_origins: []
  include_sections: []
  include_packages: []
category_metadata:
  - id: navigation
    label: "Navigation & Charts"
    icon: "compass"
    description: "Chart plotting and navigation tools"
  - id: monitoring
    label: "Monitoring & Analytics"
    icon: "chart-line"
    description: "Data logging and monitoring systems"
"""
    )

    mock_apt = MagicMock()
    mock_apt.Cache = MagicMock(return_value=mock_cache_with_categories)

    with patch.dict("sys.modules", {"apt": mock_apt}):
        with patch(
            "cockpit_apt_bridge.commands.list_categories.load_stores"
        ) as mock_load_stores:
            from cockpit_apt_bridge.utils.store_config import load_stores as real_load_stores

            mock_load_stores.return_value = real_load_stores(store_config_dir)

            result = list_categories.execute(store_id="marine")

    category_dict = {c["id"]: c for c in result}

    # Categories with metadata should use enhanced values
    assert category_dict["navigation"]["label"] == "Navigation & Charts"
    assert category_dict["navigation"]["icon"] == "compass"
    assert category_dict["navigation"]["description"] == "Chart plotting and navigation tools"

    assert category_dict["monitoring"]["label"] == "Monitoring & Analytics"
    assert category_dict["monitoring"]["icon"] == "chart-line"

    # Categories without metadata should use auto-derived values
    assert category_dict["chartplotters"]["label"] == "Chartplotters"
    assert category_dict["chartplotters"]["icon"] is None
    assert category_dict["chartplotters"]["description"] is None


def test_list_categories_store_not_found(mock_cache_with_categories):
    """Test error handling when store ID doesn't exist."""
    mock_apt = MagicMock()
    mock_apt.Cache = MagicMock(return_value=mock_cache_with_categories)

    with patch.dict("sys.modules", {"apt": mock_apt}):
        with patch("cockpit_apt_bridge.commands.list_categories.load_stores") as mock_load:
            mock_load.return_value = []  # No stores available

            with pytest.raises(APTBridgeError) as exc_info:
                list_categories.execute(store_id="nonexistent")

            assert exc_info.value.code == "STORE_NOT_FOUND"
            assert "nonexistent" in str(exc_info.value.message)


def test_list_categories_empty_cache():
    """Test listing categories with empty cache."""
    empty_cache = MockCache([])

    mock_apt = MagicMock()
    mock_apt.Cache = MagicMock(return_value=empty_cache)
    with patch.dict("sys.modules", {"apt": mock_apt}):
        result = list_categories.execute()

    assert result == []


def test_list_categories_packages_without_categories():
    """Test with packages that have no category tags."""
    packages = [
        MockPackage("nginx", summary="HTTP server", version="1.18.0", section="web"),
        MockPackage("python3", summary="Python interpreter", version="3.11.2", section="python"),
    ]
    # No Tag field set, so no categories

    cache = MockCache(packages)
    mock_apt = MagicMock()
    mock_apt.Cache = MagicMock(return_value=cache)

    with patch.dict("sys.modules", {"apt": mock_apt}):
        result = list_categories.execute()

    assert result == []


def test_list_categories_packages_without_candidate():
    """Test handling of packages without candidate version."""
    pkg = MockPackage("test-pkg", version="1.0", section="utils")
    pkg.candidate = None  # No candidate version

    cache = MockCache([pkg])
    mock_apt = MagicMock()
    mock_apt.Cache = MagicMock(return_value=cache)

    with patch.dict("sys.modules", {"apt": mock_apt}):
        result = list_categories.execute()

    # Should handle gracefully and return empty list
    assert result == []


def test_list_categories_cache_error():
    """Test handling of cache errors."""
    mock_apt = MagicMock()
    mock_apt.Cache = MagicMock(side_effect=Exception("Cache error"))
    with patch.dict("sys.modules", {"apt": mock_apt}):
        with pytest.raises(APTBridgeError) as exc_info:
            list_categories.execute()

        assert exc_info.value.code == "CACHE_ERROR"

"""
Unit tests for sections and list-section commands.
"""

from unittest.mock import MagicMock, patch
from pathlib import Path

import pytest

from cockpit_apt_bridge.commands import list_section, sections
from cockpit_apt_bridge.utils.errors import APTBridgeError
from tests.conftest import MockCache, MockPackage


def test_sections_success(mock_apt_cache):
    """Test listing all sections with package counts."""
    mock_apt = MagicMock()
    mock_apt.Cache = MagicMock(return_value=mock_apt_cache)
    with patch.dict("sys.modules", {"apt": mock_apt}):
        result = sections.execute()

    # Should be a list
    assert isinstance(result, list)
    assert len(result) > 0

    # Each section should have name and count
    for section in result:
        assert "name" in section
        assert "count" in section
        assert isinstance(section["count"], int)
        assert section["count"] > 0

    # Should be sorted alphabetically
    section_names = [s["name"] for s in result]
    assert section_names == sorted(section_names)

    # Check that we have expected sections from sample_packages
    section_names_set = set(section_names)
    assert "web" in section_names_set
    assert "python" in section_names_set
    assert "editors" in section_names_set


def test_sections_counts_correct(mock_apt_cache):
    """Test that package counts are correct."""
    mock_apt = MagicMock()
    mock_apt.Cache = MagicMock(return_value=mock_apt_cache)
    with patch.dict("sys.modules", {"apt": mock_apt}):
        result = sections.execute()

    # From sample_packages: web has 3 packages (nginx, nginx-common, apache2)
    web_section = next((s for s in result if s["name"] == "web"), None)
    assert web_section is not None
    assert web_section["count"] == 3

    # python has 2 packages (python3, python3-apt)
    python_section = next((s for s in result if s["name"] == "python"), None)
    assert python_section is not None
    assert python_section["count"] == 2


def test_sections_empty_cache():
    """Test sections with empty cache."""
    empty_cache = MockCache([])

    mock_apt = MagicMock()
    mock_apt.Cache = MagicMock(return_value=empty_cache)
    with patch.dict("sys.modules", {"apt": mock_apt}):
        result = sections.execute()

    assert result == []


def test_sections_cache_error():
    """Test handling of cache errors."""
    mock_apt = MagicMock()
    mock_apt.Cache = MagicMock(side_effect=Exception("Cache error"))
    with patch.dict("sys.modules", {"apt": mock_apt}):
        with pytest.raises(APTBridgeError) as exc_info:
            sections.execute()

        assert exc_info.value.code == "CACHE_ERROR"


def test_list_section_success(mock_apt_cache):
    """Test listing packages in a specific section."""
    mock_apt = MagicMock()
    mock_apt.Cache = MagicMock(return_value=mock_apt_cache)
    with patch.dict("sys.modules", {"apt": mock_apt}):
        result = list_section.execute("web")

    # Should return list of packages
    assert isinstance(result, list)
    assert len(result) == 3  # nginx, nginx-common, apache2

    # All packages should be in web section
    for pkg in result:
        assert pkg["section"] == "web"

    # Should be sorted alphabetically
    names = [p["name"] for p in result]
    assert names == sorted(names)

    # Check specific packages
    assert any(p["name"] == "nginx" for p in result)
    assert any(p["name"] == "apache2" for p in result)


def test_list_section_installed_flag(mock_apt_cache):
    """Test that installed flag is correctly set."""
    mock_apt = MagicMock()
    mock_apt.Cache = MagicMock(return_value=mock_apt_cache)
    with patch.dict("sys.modules", {"apt": mock_apt}):
        result = list_section.execute("web")

    # nginx-common is installed, nginx and apache2 are not
    nginx_common = next(p for p in result if p["name"] == "nginx-common")
    assert nginx_common["installed"] is True

    nginx = next(p for p in result if p["name"] == "nginx")
    assert nginx["installed"] is False


def test_list_section_empty_section(mock_apt_cache):
    """Test listing an empty or non-existent section."""
    mock_apt = MagicMock()
    mock_apt.Cache = MagicMock(return_value=mock_apt_cache)
    with patch.dict("sys.modules", {"apt": mock_apt}):
        result = list_section.execute("nonexistent")

    # Should return empty list, not error
    assert result == []


def test_list_section_invalid_name():
    """Test validation of section name."""
    with pytest.raises(APTBridgeError) as exc_info:
        list_section.execute("../etc")

    assert exc_info.value.code == "INVALID_INPUT"


def test_list_section_empty_name():
    """Test validation rejects empty section name."""
    with pytest.raises(APTBridgeError) as exc_info:
        list_section.execute("")

    assert exc_info.value.code == "INVALID_INPUT"


def test_list_section_all_fields(mock_apt_cache):
    """Test that all required fields are present."""
    mock_apt = MagicMock()
    mock_apt.Cache = MagicMock(return_value=mock_apt_cache)
    with patch.dict("sys.modules", {"apt": mock_apt}):
        result = list_section.execute("web")

    for pkg in result:
        assert "name" in pkg
        assert "summary" in pkg
        assert "version" in pkg
        assert "installed" in pkg
        assert "section" in pkg


def test_list_section_cache_error():
    """Test handling of cache errors."""
    mock_apt = MagicMock()
    mock_apt.Cache = MagicMock(side_effect=Exception("Cache error"))
    with patch.dict("sys.modules", {"apt": mock_apt}):
        with pytest.raises(APTBridgeError) as exc_info:
            list_section.execute("web")

        assert exc_info.value.code == "CACHE_ERROR"


# Store filtering tests


@pytest.fixture
def marine_packages():
    """Fixture providing marine-themed test packages for store filtering."""
    packages = []

    # Marine packages with field::marine tag
    packages.append(
        MockPackage(
            "opencpn-container",
            summary="Open source chart plotter",
            version="5.10.2-1",
            section="graphics",
        )
    )
    packages[-1].candidate.record["Tag"] = "role::container-app, field::marine"

    packages.append(
        MockPackage(
            "signalk-server-container",
            summary="Marine data server",
            version="2.0.0-1",
            section="net",
        )
    )
    packages[-1].candidate.record["Tag"] = "role::container-app, field::marine"

    # Non-marine package
    packages.append(
        MockPackage(
            "nginx",
            summary="HTTP server",
            version="1.18.0",
            section="web",
        )
    )
    packages[-1].candidate.record["Tag"] = "role::server, interface::web"

    packages.append(
        MockPackage(
            "apache2",
            summary="Apache HTTP Server",
            version="2.4.54",
            section="web",
        )
    )
    packages[-1].candidate.record["Tag"] = "role::server, interface::web"

    return packages


@pytest.fixture
def mock_cache_with_marine(marine_packages):
    """Fixture providing a mock APT cache with marine and non-marine packages."""
    return MockCache(marine_packages)


@pytest.fixture
def temp_store_config(tmp_path):
    """Create temporary store config for testing."""
    store_dir = tmp_path / "stores"
    store_dir.mkdir()

    store_file = store_dir / "marine.yaml"
    store_file.write_text("""id: marine
name: Marine Navigation & Monitoring
description: Marine apps
filters:
  include_tags:
    - field::marine
""")

    return store_dir


def test_sections_without_store_id(mock_cache_with_marine):
    """Test sections command without store_id returns all packages."""
    mock_apt = MagicMock()
    mock_apt.Cache = MagicMock(return_value=mock_cache_with_marine)
    with patch.dict("sys.modules", {"apt": mock_apt}):
        result = sections.execute(store_id=None)

    # Should return all sections
    section_names = [s["name"] for s in result]
    assert "graphics" in section_names  # opencpn
    assert "net" in section_names  # signalk
    assert "web" in section_names  # nginx, apache2

    # Check counts
    web_section = next(s for s in result if s["name"] == "web")
    assert web_section["count"] == 2  # nginx + apache2


def test_sections_with_store_id_filters_packages(mock_cache_with_marine, temp_store_config):
    """Test sections command with store_id only returns filtered packages."""
    mock_apt = MagicMock()
    mock_apt.Cache = MagicMock(return_value=mock_cache_with_marine)

    with patch.dict("sys.modules", {"apt": mock_apt}):
        with patch("cockpit_apt_bridge.utils.store_config.STORE_CONFIG_DIR", temp_store_config):
            result = sections.execute(store_id="marine")

    # Should only return sections for marine packages
    section_names = [s["name"] for s in result]
    assert "graphics" in section_names  # opencpn (marine)
    assert "net" in section_names  # signalk (marine)
    assert "web" not in section_names  # nginx, apache2 (not marine)

    # Check counts
    graphics_section = next(s for s in result if s["name"] == "graphics")
    assert graphics_section["count"] == 1  # only opencpn

    net_section = next(s for s in result if s["name"] == "net")
    assert net_section["count"] == 1  # only signalk


def test_sections_with_invalid_store_id(mock_cache_with_marine, temp_store_config):
    """Test sections command with invalid store_id raises error."""
    mock_apt = MagicMock()
    mock_apt.Cache = MagicMock(return_value=mock_cache_with_marine)

    with patch.dict("sys.modules", {"apt": mock_apt}):
        with patch("cockpit_apt_bridge.utils.store_config.STORE_CONFIG_DIR", temp_store_config):
            with pytest.raises(APTBridgeError) as exc_info:
                sections.execute(store_id="invalid-store")

            assert exc_info.value.code == "STORE_NOT_FOUND"
            assert "invalid-store" in str(exc_info.value)


def test_sections_with_store_id_empty_result(mock_apt_cache, temp_store_config):
    """Test sections with store_id when no packages match the filter."""
    # mock_apt_cache has no marine packages
    mock_apt = MagicMock()
    mock_apt.Cache = MagicMock(return_value=mock_apt_cache)

    with patch.dict("sys.modules", {"apt": mock_apt}):
        with patch("cockpit_apt_bridge.utils.store_config.STORE_CONFIG_DIR", temp_store_config):
            result = sections.execute(store_id="marine")

    # Should return empty list when no packages match
    assert result == []

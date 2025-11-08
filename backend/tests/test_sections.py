"""
Unit tests for sections and list-section commands.
"""

from unittest.mock import MagicMock, patch

import pytest

from cockpit_apt_bridge.commands import list_section, sections
from cockpit_apt_bridge.utils.errors import APTBridgeError
from tests.conftest import MockCache


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

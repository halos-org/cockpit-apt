"""Tests for list_stores command."""

from unittest.mock import patch

from cockpit_apt_bridge.commands import list_stores


def test_list_stores_empty():
    """Test listing stores when none are configured."""
    with patch("cockpit_apt_bridge.commands.list_stores.load_stores", return_value=[]):
        result = list_stores.execute()

    assert result == []


def test_list_stores_with_stores():
    """Test listing stores with configurations."""
    from cockpit_apt_bridge.utils.store_config import StoreConfig, StoreFilter

    mock_stores = [
        StoreConfig(
            id="marine",
            name="Marine Apps",
            description="Marine navigation applications",
            filters=StoreFilter(
                include_tags=["field::marine"],
                include_origins=[],
                include_sections=[],
                include_packages=[],
            ),
            icon="/icons/marine.svg",
            banner="/banners/marine.jpg",
            custom_sections=None,
        ),
    ]

    with patch("cockpit_apt_bridge.commands.list_stores.load_stores", return_value=mock_stores):
        result = list_stores.execute()

    assert len(result) == 1
    assert result[0]["id"] == "marine"
    assert result[0]["name"] == "Marine Apps"
    assert result[0]["description"] == "Marine navigation applications"
    assert result[0]["icon"] == "/icons/marine.svg"
    assert result[0]["banner"] == "/banners/marine.jpg"
    assert result[0]["filters"]["include_tags"] == ["field::marine"]
    assert result[0]["custom_sections"] is None

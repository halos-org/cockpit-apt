"""Tests for store filter matching logic."""

from unittest.mock import MagicMock

from cockpit_apt_bridge.utils.store_config import StoreConfig, StoreFilter
from cockpit_apt_bridge.utils.store_filter import (
    count_matching_packages,
    filter_packages,
    matches_store_filter,
)


def create_mock_package(
    name: str,
    origin: str = "",
    label: str = "",
    suite: str = "",
    section: str = "",
    tags: str | None = None,
):
    """Create a mock APT package with all relevant fields."""
    package = MagicMock()
    package.name = name

    # Setup candidate
    package.candidate = MagicMock()

    # Setup origin info
    if origin or label or suite:
        origin_obj = MagicMock()
        origin_obj.origin = origin
        origin_obj.label = label
        origin_obj.suite = suite
        package.candidate.origins = [origin_obj]
    else:
        package.candidate.origins = []

    # Setup section
    package.candidate.section = section if section else None

    # Setup tags
    if tags is not None:
        package.candidate.record = {"Tag": tags}
    else:
        package.candidate.record = {}

    return package


def test_matches_origin_only():
    """Match by origin only."""
    pkg = create_mock_package("test-pkg", origin="Hat Labs", suite="stable")

    filters = StoreFilter(
        include_origins=["Hat Labs"],
        include_sections=[],
        include_tags=[],
        include_packages=[],
    )
    store = StoreConfig(id="test", name="Test", description="Test", filters=filters)

    assert matches_store_filter(pkg, store) is True


def test_matches_section_only():
    """Match by section only."""
    pkg = create_mock_package("test-pkg", section="net")

    filters = StoreFilter(
        include_origins=[],
        include_sections=["net"],
        include_tags=[],
        include_packages=[],
    )
    store = StoreConfig(id="test", name="Test", description="Test", filters=filters)

    assert matches_store_filter(pkg, store) is True


def test_matches_tags_only():
    """Match by tags only."""
    pkg = create_mock_package("test-pkg", tags="field::marine, role::app")

    filters = StoreFilter(
        include_origins=[],
        include_sections=[],
        include_tags=["field::marine"],
        include_packages=[],
    )
    store = StoreConfig(id="test", name="Test", description="Test", filters=filters)

    assert matches_store_filter(pkg, store) is True


def test_matches_explicit_package_only():
    """Match by explicit package name."""
    pkg = create_mock_package("signalk-server")

    filters = StoreFilter(
        include_origins=[],
        include_sections=[],
        include_tags=[],
        include_packages=["signalk-server"],
    )
    store = StoreConfig(id="test", name="Test", description="Test", filters=filters)

    assert matches_store_filter(pkg, store) is True


def test_matches_multiple_filter_types_or_logic():
    """Multiple filter types use OR logic between them."""
    pkg = create_mock_package(
        "test-pkg",
        origin="Hat Labs",
        suite="stable",
        section="net",
        tags="field::marine",
    )

    # Package matches ALL specified filters
    filters = StoreFilter(
        include_origins=["Hat Labs"],
        include_sections=["net"],
        include_tags=["field::marine"],
        include_packages=[],
    )
    store = StoreConfig(id="test", name="Test", description="Test", filters=filters)

    assert matches_store_filter(pkg, store) is True

    # Package matches at least one filter type (origin and tags, but not section)
    filters2 = StoreFilter(
        include_origins=["Hat Labs"],
        include_sections=["web"],  # Wrong section (doesn't match)
        include_tags=["field::marine"],
        include_packages=[],
    )
    store2 = StoreConfig(id="test2", name="Test2", description="Test", filters=filters2)

    # Should still match because it matches origin AND tags (2 out of 3)
    assert matches_store_filter(pkg, store2) is True


def test_matches_multiple_values_or_logic():
    """Multiple values within a filter type use OR logic."""
    pkg = create_mock_package("test-pkg", origin="Hat Labs", suite="stable")

    # Package origin can match ANY of the listed origins
    filters = StoreFilter(
        include_origins=["Hat Labs", "Other Origin", "Third Origin"],
        include_sections=[],
        include_tags=[],
        include_packages=[],
    )
    store = StoreConfig(id="test", name="Test", description="Test", filters=filters)

    assert matches_store_filter(pkg, store) is True


def test_no_match_origin():
    """Package doesn't match origin filter."""
    pkg = create_mock_package("test-pkg", origin="Debian", suite="bookworm")

    filters = StoreFilter(
        include_origins=["Hat Labs"],
        include_sections=[],
        include_tags=[],
        include_packages=[],
    )
    store = StoreConfig(id="test", name="Test", description="Test", filters=filters)

    assert matches_store_filter(pkg, store) is False


def test_no_match_section():
    """Package doesn't match section filter."""
    pkg = create_mock_package("test-pkg", section="admin")

    filters = StoreFilter(
        include_origins=[],
        include_sections=["net", "web"],
        include_tags=[],
        include_packages=[],
    )
    store = StoreConfig(id="test", name="Test", description="Test", filters=filters)

    assert matches_store_filter(pkg, store) is False


def test_no_match_tags():
    """Package doesn't match tags filter."""
    pkg = create_mock_package("test-pkg", tags="field::aviation, role::app")

    filters = StoreFilter(
        include_origins=[],
        include_sections=[],
        include_tags=["field::marine"],
        include_packages=[],
    )
    store = StoreConfig(id="test", name="Test", description="Test", filters=filters)

    assert matches_store_filter(pkg, store) is False


def test_no_match_package_name():
    """Package doesn't match explicit package list."""
    pkg = create_mock_package("other-package")

    filters = StoreFilter(
        include_origins=[],
        include_sections=[],
        include_tags=[],
        include_packages=["signalk-server", "grafana"],
    )
    store = StoreConfig(id="test", name="Test", description="Test", filters=filters)

    assert matches_store_filter(pkg, store) is False


def test_matches_with_missing_metadata():
    """Package with missing metadata doesn't match filters requiring that data."""
    pkg = create_mock_package("test-pkg")  # No origin, section, tags

    # Should fail origin filter
    filters1 = StoreFilter(
        include_origins=["Hat Labs"],
        include_sections=[],
        include_tags=[],
        include_packages=[],
    )
    store1 = StoreConfig(id="test", name="Test", description="Test", filters=filters1)
    assert matches_store_filter(pkg, store1) is False

    # Should fail section filter
    filters2 = StoreFilter(
        include_origins=[],
        include_sections=["net"],
        include_tags=[],
        include_packages=[],
    )
    store2 = StoreConfig(id="test", name="Test", description="Test", filters=filters2)
    assert matches_store_filter(pkg, store2) is False

    # Should fail tags filter
    filters3 = StoreFilter(
        include_origins=[],
        include_sections=[],
        include_tags=["field::marine"],
        include_packages=[],
    )
    store3 = StoreConfig(id="test", name="Test", description="Test", filters=filters3)
    assert matches_store_filter(pkg, store3) is False


def test_matches_explicit_package_ignores_missing_metadata():
    """Explicit package match works even with missing metadata."""
    pkg = create_mock_package("signalk-server")  # No other metadata

    filters = StoreFilter(
        include_origins=[],
        include_sections=[],
        include_tags=[],
        include_packages=["signalk-server"],
    )
    store = StoreConfig(id="test", name="Test", description="Test", filters=filters)

    assert matches_store_filter(pkg, store) is True


def test_matches_multiple_tags_any():
    """Package needs to match ANY of the specified tags (OR logic)."""
    pkg = create_mock_package("test-pkg", tags="field::marine, role::app")

    filters = StoreFilter(
        include_origins=[],
        include_sections=[],
        include_tags=["field::marine", "field::aviation"],  # Matches first
        include_packages=[],
    )
    store = StoreConfig(id="test", name="Test", description="Test", filters=filters)

    assert matches_store_filter(pkg, store) is True


def test_uses_label_when_no_origin():
    """Matches using label when origin is empty."""
    pkg = create_mock_package("test-pkg", origin="", label="CustomLabel", suite="stable")

    filters = StoreFilter(
        include_origins=["CustomLabel"],
        include_sections=[],
        include_tags=[],
        include_packages=[],
    )
    store = StoreConfig(id="test", name="Test", description="Test", filters=filters)

    assert matches_store_filter(pkg, store) is True


def test_count_matching_packages():
    """Count packages matching store filters."""
    cache = MagicMock()
    pkg1 = create_mock_package("pkg1", origin="Hat Labs", suite="stable")
    pkg2 = create_mock_package("pkg2", origin="Hat Labs", suite="stable")
    pkg3 = create_mock_package("pkg3", origin="Debian", suite="bookworm")
    cache.__iter__ = MagicMock(return_value=iter([pkg1, pkg2, pkg3]))
    cache.__len__ = MagicMock(return_value=3)

    filters = StoreFilter(
        include_origins=["Hat Labs"],
        include_sections=[],
        include_tags=[],
        include_packages=[],
    )
    store = StoreConfig(id="test", name="Test", description="Test", filters=filters)

    count = count_matching_packages(cache, store)
    assert count == 2


def test_filter_packages():
    """Get list of packages matching store filters."""
    cache = MagicMock()
    pkg1 = create_mock_package("pkg1", origin="Hat Labs", suite="stable")
    pkg2 = create_mock_package("pkg2", origin="Hat Labs", suite="stable")
    pkg3 = create_mock_package("pkg3", origin="Debian", suite="bookworm")
    cache.__iter__ = MagicMock(return_value=iter([pkg1, pkg2, pkg3]))
    cache.__len__ = MagicMock(return_value=3)

    filters = StoreFilter(
        include_origins=["Hat Labs"],
        include_sections=[],
        include_tags=[],
        include_packages=[],
    )
    store = StoreConfig(id="test", name="Test", description="Test", filters=filters)

    matching = filter_packages(cache, store)
    assert len(matching) == 2
    assert pkg1 in matching
    assert pkg2 in matching
    assert pkg3 not in matching


def test_complex_filter_scenario():
    """Test realistic complex filter scenario."""
    # Marine store: packages from Hat Labs OR with marine tags OR explicit packages
    pkg1 = create_mock_package(
        "signalk-server",
        origin="Hat Labs",
        suite="stable",
        section="net",
        tags="field::marine, role::container-app",
    )
    pkg2 = create_mock_package(
        "opencpn",
        origin="Debian",
        suite="bookworm",
        section="misc",
        tags="field::marine, interface::gui",
    )
    pkg3 = create_mock_package(
        "grafana-container",
        origin="Hat Labs",
        suite="stable",
        section="admin",
        tags="role::container-app",
    )
    pkg4 = create_mock_package(
        "nginx",
        origin="Debian",
        suite="bookworm",
        section="web",
        tags="role::server",
    )

    # Filter: (Hat Labs OR marine tag) AND container section
    filters = StoreFilter(
        include_origins=["Hat Labs"],
        include_sections=[],
        include_tags=["field::marine"],
        include_packages=[],
    )
    store = StoreConfig(id="marine", name="Marine", description="Marine apps", filters=filters)

    # pkg1: Hat Labs AND marine tag -> Match
    assert matches_store_filter(pkg1, store) is True

    # pkg2: Not Hat Labs BUT has marine tag -> Match
    assert matches_store_filter(pkg2, store) is True

    # pkg3: Hat Labs BUT no marine tag -> Match (has Hat Labs origin)
    assert matches_store_filter(pkg3, store) is True

    # pkg4: Neither Hat Labs NOR marine tag -> No match
    assert matches_store_filter(pkg4, store) is False


def test_empty_filters_list_values():
    """Empty filter lists within an active filter type means no match."""
    pkg = create_mock_package("test-pkg", origin="Hat Labs", suite="stable")

    # This should not happen (validated in StoreFilter), but test behavior
    # In practice, having a filter type specified means it has values
    filters = StoreFilter(
        include_origins=["Hat Labs"],  # Has values - will be checked
        include_sections=[],  # Empty - won't be checked
        include_tags=[],  # Empty - won't be checked
        include_packages=[],  # Empty - won't be checked
    )
    store = StoreConfig(id="test", name="Test", description="Test", filters=filters)

    # Should match because only origin filter is active and it matches
    assert matches_store_filter(pkg, store) is True

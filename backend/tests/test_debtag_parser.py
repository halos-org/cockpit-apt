"""Tests for Debian package tag parser."""

from unittest.mock import MagicMock

from cockpit_apt.utils.debtag_parser import (
    get_tag_facet,
    get_tags_by_facet,
    has_tag,
    has_tag_facet,
    parse_package_tags,
)


def create_mock_package(name: str, tags: str | None = None):
    """Create a mock APT package with tags."""
    package = MagicMock()
    package.name = name

    if tags is not None:
        package.candidate = MagicMock()
        package.candidate.record = {"Tag": tags}
    else:
        package.candidate = None

    return package


def test_parse_single_tag():
    """Parse package with single tag."""
    pkg = create_mock_package("test-pkg", "field::marine")
    tags = parse_package_tags(pkg)
    assert tags == ["field::marine"]


def test_parse_multiple_tags():
    """Parse package with multiple comma-separated tags."""
    pkg = create_mock_package("test-pkg", "field::marine, role::container-app, interface::web")
    tags = parse_package_tags(pkg)
    assert len(tags) == 3
    assert "field::marine" in tags
    assert "role::container-app" in tags
    assert "interface::web" in tags


def test_parse_tags_with_whitespace():
    """Parse tags with various whitespace patterns."""
    pkg = create_mock_package("test-pkg", "field::marine,  role::container-app  , interface::web")
    tags = parse_package_tags(pkg)
    assert tags == ["field::marine", "role::container-app", "interface::web"]


def test_parse_missing_tag_field():
    """Handle package without Tag field."""
    pkg = MagicMock()
    pkg.name = "test-pkg"
    pkg.candidate = MagicMock()
    pkg.candidate.record = {}  # No Tag field
    tags = parse_package_tags(pkg)
    assert tags == []


def test_parse_empty_tag_field():
    """Handle package with empty Tag field."""
    pkg = create_mock_package("test-pkg", "")
    tags = parse_package_tags(pkg)
    assert tags == []


def test_parse_no_candidate():
    """Handle package without candidate."""
    pkg = MagicMock()
    pkg.name = "test-pkg"
    pkg.candidate = None
    tags = parse_package_tags(pkg)
    assert tags == []


def test_parse_non_faceted_tags():
    """Parse non-faceted tags (no :: separator)."""
    pkg = create_mock_package("test-pkg", "some-tag, another-tag")
    tags = parse_package_tags(pkg)
    assert tags == ["some-tag", "another-tag"]


def test_parse_mixed_faceted_and_non_faceted():
    """Parse mix of faceted and non-faceted tags."""
    pkg = create_mock_package("test-pkg", "field::marine, simple-tag, role::app")
    tags = parse_package_tags(pkg)
    assert len(tags) == 3
    assert "field::marine" in tags
    assert "simple-tag" in tags
    assert "role::app" in tags


def test_get_tag_facet_valid():
    """Split valid faceted tag."""
    assert get_tag_facet("field::marine") == ("field", "marine")
    assert get_tag_facet("role::container-app") == ("role", "container-app")
    assert get_tag_facet("interface::web") == ("interface", "web")


def test_get_tag_facet_non_faceted():
    """Return None for non-faceted tags."""
    assert get_tag_facet("simple-tag") is None
    assert get_tag_facet("no-separator") is None


def test_get_tag_facet_empty_parts():
    """Return None for tags with empty facet or value."""
    assert get_tag_facet("::value") is None
    assert get_tag_facet("facet::") is None
    assert get_tag_facet("::") is None


def test_get_tag_facet_multiple_separators():
    """Handle tags with multiple :: separators (split on first only)."""
    result = get_tag_facet("facet::value::extra")
    assert result == ("facet", "value::extra")


def test_has_tag_present():
    """Check if package has specific tag (present)."""
    pkg = create_mock_package("test-pkg", "field::marine, role::container-app")
    assert has_tag(pkg, "field::marine") is True
    assert has_tag(pkg, "role::container-app") is True


def test_has_tag_absent():
    """Check if package has specific tag (absent)."""
    pkg = create_mock_package("test-pkg", "field::marine")
    assert has_tag(pkg, "field::aviation") is False
    assert has_tag(pkg, "role::app") is False


def test_has_tag_case_sensitive():
    """Tag matching is case-sensitive."""
    pkg = create_mock_package("test-pkg", "field::marine")
    assert has_tag(pkg, "field::marine") is True
    assert has_tag(pkg, "field::Marine") is False
    assert has_tag(pkg, "Field::marine") is False


def test_has_tag_no_tags():
    """Check tag on package with no tags."""
    pkg = create_mock_package("test-pkg", None)
    assert has_tag(pkg, "field::marine") is False


def test_has_tag_facet_with_value():
    """Check if package has tag with specific facet and value."""
    pkg = create_mock_package("test-pkg", "field::marine, role::container-app")
    assert has_tag_facet(pkg, "field", "marine") is True
    assert has_tag_facet(pkg, "role", "container-app") is True
    assert has_tag_facet(pkg, "field", "aviation") is False


def test_has_tag_facet_without_value():
    """Check if package has any tag with specific facet."""
    pkg = create_mock_package("test-pkg", "field::marine, role::container-app")
    assert has_tag_facet(pkg, "field") is True
    assert has_tag_facet(pkg, "role") is True
    assert has_tag_facet(pkg, "interface") is False


def test_has_tag_facet_multiple_values():
    """Check facet when package has multiple tags with same facet."""
    pkg = create_mock_package("test-pkg", "field::marine, field::navigation")
    assert has_tag_facet(pkg, "field") is True
    assert has_tag_facet(pkg, "field", "marine") is True
    assert has_tag_facet(pkg, "field", "navigation") is True
    assert has_tag_facet(pkg, "field", "aviation") is False


def test_has_tag_facet_non_faceted_tags():
    """Non-faceted tags are ignored by has_tag_facet."""
    pkg = create_mock_package("test-pkg", "simple-tag, field::marine")
    assert has_tag_facet(pkg, "field", "marine") is True
    # Non-faceted tag doesn't match
    assert has_tag_facet(pkg, "simple-tag") is False


def test_get_tags_by_facet():
    """Get all values for a specific facet."""
    pkg = create_mock_package("test-pkg", "field::marine, field::navigation, role::app")
    values = get_tags_by_facet(pkg, "field")
    assert len(values) == 2
    assert "marine" in values
    assert "navigation" in values


def test_get_tags_by_facet_single():
    """Get single value for a facet."""
    pkg = create_mock_package("test-pkg", "field::marine, role::app")
    values = get_tags_by_facet(pkg, "field")
    assert values == ["marine"]


def test_get_tags_by_facet_none():
    """Get empty list when no tags match facet."""
    pkg = create_mock_package("test-pkg", "field::marine, role::app")
    values = get_tags_by_facet(pkg, "interface")
    assert values == []


def test_get_tags_by_facet_ignores_non_faceted():
    """Non-faceted tags are ignored by get_tags_by_facet."""
    pkg = create_mock_package("test-pkg", "simple-tag, field::marine")
    values = get_tags_by_facet(pkg, "field")
    assert values == ["marine"]


def test_parse_tags_handles_malformed_record():
    """Handle package with malformed record structure."""
    pkg = MagicMock()
    pkg.name = "test-pkg"
    pkg.candidate = MagicMock()
    pkg.candidate.record = None  # Malformed
    tags = parse_package_tags(pkg)
    assert tags == []


def test_parse_tags_handles_non_string_tag():
    """Handle package where Tag field is not a string."""
    pkg = MagicMock()
    pkg.name = "test-pkg"
    pkg.candidate = MagicMock()
    pkg.candidate.record = {"Tag": 123}  # Not a string
    tags = parse_package_tags(pkg)
    assert tags == []


def test_parse_tags_filters_empty_strings():
    """Empty strings after splitting are filtered out."""
    pkg = create_mock_package("test-pkg", "field::marine,,role::app")
    tags = parse_package_tags(pkg)
    assert len(tags) == 2
    assert "" not in tags


def test_real_world_tag_example():
    """Test with realistic Debian tag set."""
    # Example from a real package
    pkg = create_mock_package(
        "signalk-server",
        "field::marine, implemented-in::javascript, interface::web, "
        "role::container-app, scope::application, uitoolkit::nodejs",
    )

    tags = parse_package_tags(pkg)
    assert len(tags) == 6

    # Check specific tags
    assert has_tag(pkg, "field::marine") is True
    assert has_tag(pkg, "role::container-app") is True

    # Check facets
    assert has_tag_facet(pkg, "field", "marine") is True
    assert has_tag_facet(pkg, "interface", "web") is True

    # Get all implementation tags
    impl_tags = get_tags_by_facet(pkg, "implemented-in")
    assert impl_tags == ["javascript"]

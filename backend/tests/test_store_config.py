"""Tests for store configuration loading."""

from pathlib import Path
from tempfile import TemporaryDirectory

import pytest

from cockpit_apt.utils.store_config import (
    StoreConfig,
    StoreFilter,
    load_stores,
)


def test_store_filter_requires_origins():
    """StoreFilter must have non-empty include_origins."""
    # Valid: has origins
    filter1 = StoreFilter(
        include_origins=["test"],
        include_sections=[],
        include_tags=[],
        include_packages=[],
    )
    assert filter1.include_origins == ["test"]

    # Invalid: empty origins list
    with pytest.raises(ValueError, match="include_origins is required"):
        StoreFilter(
            include_origins=[],
            include_sections=[],
            include_tags=[],
            include_packages=[],
        )

    # Invalid: empty origins with other filters populated
    with pytest.raises(ValueError, match="include_origins is required"):
        StoreFilter(
            include_origins=[],
            include_sections=["net"],
            include_tags=["field::marine"],
            include_packages=[],
        )


def test_store_config_validates_id():
    """StoreConfig validates ID format."""
    filters = StoreFilter(
        include_origins=["test"],
        include_sections=[],
        include_tags=[],
        include_packages=[],
    )

    # Valid IDs
    StoreConfig(id="marine", name="Marine", description="Test", filters=filters)
    StoreConfig(id="marine-apps", name="Marine", description="Test", filters=filters)
    StoreConfig(id="test_store", name="Test", description="Test", filters=filters)

    # Invalid IDs
    with pytest.raises(ValueError, match="Invalid store ID"):
        StoreConfig(id="", name="Test", description="Test", filters=filters)

    with pytest.raises(ValueError, match="Invalid store ID"):
        StoreConfig(id="test store", name="Test", description="Test", filters=filters)

    with pytest.raises(ValueError, match="Invalid store ID"):
        StoreConfig(id="test@store", name="Test", description="Test", filters=filters)


def test_load_stores_handles_missing_directory():
    """load_stores returns empty list when directory doesn't exist."""
    with TemporaryDirectory() as tmpdir:
        non_existent = Path(tmpdir) / "does_not_exist"
        stores = load_stores(config_dir=non_existent)
        assert stores == []


def test_load_stores_handles_file_instead_of_directory():
    """load_stores returns empty list when path is a file, not directory."""
    with TemporaryDirectory() as tmpdir:
        tmppath = Path(tmpdir)
        file_path = tmppath / "not_a_directory"
        file_path.touch()

        stores = load_stores(config_dir=file_path)
        assert stores == []


def test_load_store_with_all_fields():
    """Load store config with all optional fields populated."""
    with TemporaryDirectory() as tmpdir:
        tmppath = Path(tmpdir)
        config_file = tmppath / "marine.yaml"
        config_file.write_text("""
id: marine
name: Marine Navigation
description: Marine navigation and monitoring applications
icon: /usr/share/icons/marine.svg
banner: /usr/share/banners/marine.png
filters:
  include_origins:
    - Hat Labs
  include_sections:
    - net
  include_tags:
    - field::marine
  include_packages:
    - signalk-server
category_metadata:
  - id: ais-radar
    label: AIS & Radar
    description: AIS and radar applications
    icon: /usr/share/icons/ais.svg
""")

        stores = load_stores(config_dir=tmppath)
        assert len(stores) == 1

        store = stores[0]
        assert store.id == "marine"
        assert store.name == "Marine Navigation"
        assert store.description == "Marine navigation and monitoring applications"
        assert store.icon == "/usr/share/icons/marine.svg"
        assert store.banner == "/usr/share/banners/marine.png"

        assert store.filters.include_origins == ["Hat Labs"]
        assert store.filters.include_sections == ["net"]
        assert store.filters.include_tags == ["field::marine"]
        assert store.filters.include_packages == ["signalk-server"]

        assert store.category_metadata is not None
        assert len(store.category_metadata) == 1
        assert store.category_metadata[0].id == "ais-radar"
        assert store.category_metadata[0].label == "AIS & Radar"
        assert store.category_metadata[0].icon == "/usr/share/icons/ais.svg"


def test_load_store_with_minimal_fields():
    """Load store config with only required fields."""
    with TemporaryDirectory() as tmpdir:
        tmppath = Path(tmpdir)
        config_file = tmppath / "minimal.yaml"
        config_file.write_text("""
id: minimal
name: Minimal Store
description: A minimal store configuration
filters:
  include_origins:
    - TestOrigin
""")

        stores = load_stores(config_dir=tmppath)
        assert len(stores) == 1

        store = stores[0]
        assert store.id == "minimal"
        assert store.name == "Minimal Store"
        assert store.icon is None
        assert store.banner is None
        assert store.category_metadata is None
        assert store.filters.include_origins == ["TestOrigin"]
        assert store.filters.include_sections == []


def test_load_stores_handles_invalid_yaml():
    """load_stores skips files with invalid YAML syntax."""
    with TemporaryDirectory() as tmpdir:
        tmppath = Path(tmpdir)

        # Valid config
        (tmppath / "valid.yaml").write_text("""
id: valid
name: Valid Store
description: A valid store
filters:
  include_origins:
    - TestOrigin
""")

        # Invalid YAML
        (tmppath / "invalid.yaml").write_text("""
id: broken
name: [unclosed list
""")

        stores = load_stores(config_dir=tmppath)
        assert len(stores) == 1
        assert stores[0].id == "valid"


def test_load_stores_handles_missing_required_fields():
    """load_stores skips configs with missing required fields."""
    with TemporaryDirectory() as tmpdir:
        tmppath = Path(tmpdir)

        # Missing 'description'
        (tmppath / "missing_desc.yaml").write_text("""
id: test
name: Test Store
filters:
  include_origins:
    - TestOrigin
""")

        # Missing 'filters'
        (tmppath / "missing_filters.yaml").write_text("""
id: test2
name: Test Store 2
description: A test store
""")

        stores = load_stores(config_dir=tmppath)
        assert len(stores) == 0


def test_load_multiple_stores():
    """Load multiple store configurations."""
    with TemporaryDirectory() as tmpdir:
        tmppath = Path(tmpdir)

        (tmppath / "store1.yaml").write_text("""
id: store1
name: Store One
description: First store
filters:
  include_origins:
    - Origin1
""")

        (tmppath / "store2.yaml").write_text("""
id: store2
name: Store Two
description: Second store
filters:
  include_origins:
    - Origin2
  include_sections:
    - net
""")

        stores = load_stores(config_dir=tmppath)
        assert len(stores) == 2

        store_ids = {s.id for s in stores}
        assert store_ids == {"store1", "store2"}


def test_load_stores_detects_duplicate_ids():
    """load_stores skips stores with duplicate IDs."""
    with TemporaryDirectory() as tmpdir:
        tmppath = Path(tmpdir)

        (tmppath / "first.yaml").write_text("""
id: duplicate
name: First Store
description: First store
filters:
  include_origins:
    - Origin1
""")

        (tmppath / "second.yaml").write_text("""
id: duplicate
name: Second Store
description: Second store with same ID
filters:
  include_origins:
    - Origin2
""")

        stores = load_stores(config_dir=tmppath)
        # Only the first one (alphabetically by filename) is loaded
        assert len(stores) == 1
        assert stores[0].name == "First Store"


def test_load_stores_handles_empty_origins():
    """load_stores rejects configs with empty include_origins."""
    with TemporaryDirectory() as tmpdir:
        tmppath = Path(tmpdir)

        (tmppath / "empty.yaml").write_text("""
id: empty
name: Empty Origins
description: Store with empty origins (invalid)
filters:
  include_origins: []
  include_sections: []
  include_tags: []
  include_packages: []
""")

        stores = load_stores(config_dir=tmppath)
        assert len(stores) == 0

        # Even with other filters, empty origins should fail
        (tmppath / "empty2.yaml").write_text("""
id: empty2
name: Empty Origins 2
description: Store with empty origins but other filters
filters:
  include_origins: []
  include_sections:
    - net
  include_tags:
    - field::marine
""")

        stores = load_stores(config_dir=tmppath)
        assert len(stores) == 0


def test_filter_lists_parsed_correctly():
    """Verify filter lists are parsed with correct values."""
    with TemporaryDirectory() as tmpdir:
        tmppath = Path(tmpdir)

        (tmppath / "filters.yaml").write_text("""
id: filters
name: Filter Test
description: Testing filter parsing
filters:
  include_origins:
    - Origin1
    - Origin2
  include_sections:
    - net
    - admin
  include_tags:
    - field::marine
    - role::container-app
  include_packages:
    - package1
    - package2
    - package3
""")

        stores = load_stores(config_dir=tmppath)
        assert len(stores) == 1

        filters = stores[0].filters
        assert len(filters.include_origins) == 2
        assert "Origin1" in filters.include_origins
        assert "Origin2" in filters.include_origins

        assert len(filters.include_sections) == 2
        assert "net" in filters.include_sections

        assert len(filters.include_tags) == 2
        assert "field::marine" in filters.include_tags

        assert len(filters.include_packages) == 3


def test_category_metadata_parsed_correctly():
    """Verify category metadata is parsed correctly."""
    with TemporaryDirectory() as tmpdir:
        tmppath = Path(tmpdir)

        (tmppath / "custom.yaml").write_text("""
id: custom
name: Custom Categories
description: Store with category metadata
filters:
  include_origins:
    - TestOrigin
category_metadata:
  - id: ais-radar
    label: AIS & Radar
    description: AIS and radar applications
    icon: /path/to/icon.svg
  - id: navigation
    label: Navigation
    description: Navigation tools
""")

        stores = load_stores(config_dir=tmppath)
        assert len(stores) == 1

        metadata = stores[0].category_metadata
        assert metadata is not None
        assert len(metadata) == 2

        assert metadata[0].id == "ais-radar"
        assert metadata[0].label == "AIS & Radar"
        assert metadata[0].description == "AIS and radar applications"
        assert metadata[0].icon == "/path/to/icon.svg"

        assert metadata[1].id == "navigation"
        assert metadata[1].icon is None  # Icon is optional


def test_category_metadata_skips_invalid_entries():
    """Invalid category metadata entries are skipped with warning."""
    with TemporaryDirectory() as tmpdir:
        tmppath = Path(tmpdir)

        (tmppath / "partial.yaml").write_text("""
id: partial
name: Partial Categories
description: Store with invalid category metadata
filters:
  include_origins:
    - TestOrigin
category_metadata:
  - id: valid
    label: Valid Category
    description: This is valid
  - id: invalid
    description: Missing Label
  - label: Also Invalid
    description: Missing id field
""")

        stores = load_stores(config_dir=tmppath)
        assert len(stores) == 1

        # Only the valid category should be loaded
        metadata = stores[0].category_metadata
        assert metadata is not None
        assert len(metadata) == 1
        assert metadata[0].id == "valid"


def test_supports_yml_extension():
    """load_stores supports both .yaml and .yml extensions."""
    with TemporaryDirectory() as tmpdir:
        tmppath = Path(tmpdir)

        (tmppath / "store1.yaml").write_text("""
id: yaml
name: YAML Extension
description: Store with .yaml extension
filters:
  include_origins:
    - Origin1
""")

        (tmppath / "store2.yml").write_text("""
id: yml
name: YML Extension
description: Store with .yml extension
filters:
  include_origins:
    - Origin2
""")

        stores = load_stores(config_dir=tmppath)
        assert len(stores) == 2

        store_ids = {s.id for s in stores}
        assert store_ids == {"yaml", "yml"}


def test_filters_must_be_dictionary():
    """Filters field must be a dictionary."""
    with TemporaryDirectory() as tmpdir:
        tmppath = Path(tmpdir)

        (tmppath / "bad.yaml").write_text("""
id: bad
name: Bad Filters
description: Filters is not a dict
filters: not_a_dict
""")

        stores = load_stores(config_dir=tmppath)
        assert len(stores) == 0


def test_root_must_be_dictionary():
    """Root element must be a dictionary."""
    with TemporaryDirectory() as tmpdir:
        tmppath = Path(tmpdir)

        (tmppath / "list.yaml").write_text("""
- id: bad
  name: Bad Root
""")

        stores = load_stores(config_dir=tmppath)
        assert len(stores) == 0

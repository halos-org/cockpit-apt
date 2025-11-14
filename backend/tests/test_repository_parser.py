"""Tests for repository metadata parser."""

from unittest.mock import MagicMock

from cockpit_apt_bridge.utils.repository_parser import (
    Repository,
    get_package_repository,
    package_matches_repository,
    parse_repositories,
)


def create_mock_origin(origin: str = "", label: str = "", suite: str = ""):
    """Create a mock origin object."""
    origin_obj = MagicMock()
    origin_obj.origin = origin
    origin_obj.label = label
    origin_obj.suite = suite
    return origin_obj


def create_mock_package(name: str, origin: str = "", label: str = "", suite: str = ""):
    """Create a mock APT package with origin info."""
    package = MagicMock()
    package.name = name

    if origin or label or suite:
        package.candidate = MagicMock()
        package.candidate.origins = [create_mock_origin(origin, label, suite)]
    else:
        package.candidate = None

    return package


def test_parse_repositories_single():
    """Parse cache with single repository."""
    cache = MagicMock()
    pkg1 = create_mock_package("pkg1", origin="Debian", label="Debian", suite="bookworm")
    pkg2 = create_mock_package("pkg2", origin="Debian", label="Debian", suite="bookworm")
    cache.__iter__ = MagicMock(return_value=iter([pkg1, pkg2]))

    repos = parse_repositories(cache)

    assert len(repos) == 1
    assert repos[0].name == "Debian"
    assert repos[0].origin == "Debian"
    assert repos[0].suite == "bookworm"
    assert repos[0].id == "Debian:bookworm"
    assert repos[0].package_count == 2


def test_parse_repositories_multiple():
    """Parse cache with multiple repositories."""
    cache = MagicMock()
    pkg1 = create_mock_package("pkg1", origin="Debian", label="Debian", suite="bookworm")
    pkg2 = create_mock_package("pkg2", origin="Hat Labs", label="hatlabs", suite="stable")
    pkg3 = create_mock_package("pkg3", origin="Debian", label="Debian", suite="bookworm")
    cache.__iter__ = MagicMock(return_value=iter([pkg1, pkg2, pkg3]))

    repos = parse_repositories(cache)

    assert len(repos) == 2

    # Should be sorted alphabetically
    repo_names = [r.name for r in repos]
    assert repo_names == ["Debian", "Hat Labs"]

    # Check package counts
    debian_repo = [r for r in repos if r.name == "Debian"][0]
    hatlabs_repo = [r for r in repos if r.name == "Hat Labs"][0]

    assert debian_repo.package_count == 2
    assert hatlabs_repo.package_count == 1


def test_parse_repositories_deduplicates_by_origin_suite():
    """Repositories are deduplicated by (origin, suite) combination."""
    cache = MagicMock()
    pkg1 = create_mock_package("pkg1", origin="Debian", label="Debian", suite="bookworm")
    pkg2 = create_mock_package("pkg2", origin="Debian", label="Debian", suite="bookworm")
    pkg3 = create_mock_package("pkg3", origin="Debian", label="Debian", suite="sid")
    cache.__iter__ = MagicMock(return_value=iter([pkg1, pkg2, pkg3]))

    repos = parse_repositories(cache)

    assert len(repos) == 2

    # Two different suites from same origin
    repo_ids = {r.id for r in repos}
    assert "Debian:bookworm" in repo_ids
    assert "Debian:sid" in repo_ids


def test_parse_repositories_prefers_origin_over_label():
    """Display name prefers Origin over Label."""
    cache = MagicMock()
    pkg = create_mock_package("pkg1", origin="Debian GNU/Linux", label="Debian", suite="stable")
    cache.__iter__ = MagicMock(return_value=iter([pkg]))

    repos = parse_repositories(cache)

    assert len(repos) == 1
    assert repos[0].name == "Debian GNU/Linux"  # Origin, not Label
    assert repos[0].origin == "Debian GNU/Linux"
    assert repos[0].label == "Debian"


def test_parse_repositories_uses_label_when_no_origin():
    """Uses Label when Origin is empty."""
    cache = MagicMock()
    pkg = create_mock_package("pkg1", origin="", label="Custom Label", suite="stable")
    cache.__iter__ = MagicMock(return_value=iter([pkg]))

    repos = parse_repositories(cache)

    assert len(repos) == 1
    assert repos[0].name == "Custom Label"
    assert repos[0].origin == ""
    assert repos[0].label == "Custom Label"


def test_parse_repositories_skips_packages_without_origin():
    """Packages without origin info are skipped."""
    cache = MagicMock()
    pkg1 = create_mock_package("pkg1", origin="Debian", label="Debian", suite="bookworm")
    pkg2 = create_mock_package("pkg2")  # No origin info
    cache.__iter__ = MagicMock(return_value=iter([pkg1, pkg2]))

    repos = parse_repositories(cache)

    assert len(repos) == 1
    assert repos[0].name == "Debian"


def test_parse_repositories_requires_suite():
    """Repositories must have a suite."""
    cache = MagicMock()
    pkg1 = create_mock_package("pkg1", origin="Debian", label="Debian", suite="bookworm")
    pkg2 = create_mock_package("pkg2", origin="NoSuite", label="NoSuite", suite="")
    cache.__iter__ = MagicMock(return_value=iter([pkg1, pkg2]))

    repos = parse_repositories(cache)

    assert len(repos) == 1
    assert repos[0].name == "Debian"


def test_parse_repositories_requires_origin_or_label():
    """Repositories must have either origin or label."""
    cache = MagicMock()
    pkg1 = create_mock_package("pkg1", origin="Debian", label="", suite="bookworm")
    pkg2 = create_mock_package("pkg2", origin="", label="", suite="stable")
    cache.__iter__ = MagicMock(return_value=iter([pkg1, pkg2]))

    repos = parse_repositories(cache)

    assert len(repos) == 1
    assert repos[0].name == "Debian"


def test_parse_repositories_empty_cache():
    """Handle empty cache."""
    cache = MagicMock()
    cache.__iter__ = MagicMock(return_value=iter([]))

    repos = parse_repositories(cache)

    assert repos == []


def test_parse_repositories_sorts_alphabetically():
    """Repositories are sorted alphabetically (case-insensitive)."""
    cache = MagicMock()
    pkg1 = create_mock_package("pkg1", origin="Zebra", label="z", suite="stable")
    pkg2 = create_mock_package("pkg2", origin="alpha", label="a", suite="stable")
    pkg3 = create_mock_package("pkg3", origin="Beta", label="b", suite="stable")
    cache.__iter__ = MagicMock(return_value=iter([pkg1, pkg2, pkg3]))

    repos = parse_repositories(cache)

    names = [r.name for r in repos]
    assert names == ["alpha", "Beta", "Zebra"]


def test_get_package_repository():
    """Get repository info for a single package."""
    pkg = create_mock_package("test-pkg", origin="Debian", label="Debian", suite="bookworm")

    repo = get_package_repository(pkg)

    assert repo is not None
    assert repo.name == "Debian"
    assert repo.origin == "Debian"
    assert repo.suite == "bookworm"
    assert repo.id == "Debian:bookworm"
    assert repo.package_count == 1  # Single package


def test_get_package_repository_no_origin():
    """Return None when package has no origin info."""
    pkg = create_mock_package("test-pkg")  # No origin info

    repo = get_package_repository(pkg)

    assert repo is None


def test_get_package_repository_uses_label():
    """Uses label when origin is empty."""
    pkg = create_mock_package("test-pkg", origin="", label="CustomLabel", suite="stable")

    repo = get_package_repository(pkg)

    assert repo is not None
    assert repo.name == "CustomLabel"
    assert repo.id == "CustomLabel:stable"


def test_package_matches_repository_true():
    """Package matches its repository."""
    pkg = create_mock_package("test-pkg", origin="Debian", label="Debian", suite="bookworm")

    assert package_matches_repository(pkg, "Debian:bookworm") is True


def test_package_matches_repository_false():
    """Package doesn't match different repository."""
    pkg = create_mock_package("test-pkg", origin="Debian", label="Debian", suite="bookworm")

    assert package_matches_repository(pkg, "Debian:sid") is False
    assert package_matches_repository(pkg, "Ubuntu:jammy") is False


def test_package_matches_repository_no_origin():
    """Package without origin doesn't match any repository."""
    pkg = create_mock_package("test-pkg")  # No origin info

    assert package_matches_repository(pkg, "Debian:bookworm") is False


def test_repository_id_format():
    """Repository ID format is {origin_or_label}:{suite}."""
    repo = Repository(
        id="Debian:bookworm",
        name="Debian",
        origin="Debian",
        label="Debian",
        suite="bookworm",
        package_count=42,
    )

    assert repo.id == "Debian:bookworm"


def test_repository_is_frozen():
    """Repository dataclass is immutable."""
    repo = Repository(
        id="test:stable",
        name="Test",
        origin="Test",
        label="test",
        suite="stable",
        package_count=1,
    )

    # Should raise FrozenInstanceError
    try:
        repo.name = "Modified"  # type: ignore
        raise AssertionError("Should not be able to modify frozen dataclass")
    except AttributeError:
        pass  # Expected


def test_repository_hashable():
    """Repository can be used in sets."""
    repo1 = Repository(
        id="debian:bookworm",
        name="Debian",
        origin="Debian",
        label="Debian",
        suite="bookworm",
        package_count=100,
    )
    repo2 = Repository(
        id="debian:bookworm",
        name="Debian",
        origin="Debian",
        label="Debian",
        suite="bookworm",
        package_count=100,
    )
    repo3 = Repository(
        id="debian:sid",
        name="Debian",
        origin="Debian",
        label="Debian",
        suite="sid",
        package_count=50,
    )

    repo_set = {repo1, repo2, repo3}
    assert len(repo_set) == 2  # repo1 and repo2 have same ID


def test_parse_repositories_handles_multiple_suites():
    """Same origin with different suites creates different repositories."""
    cache = MagicMock()
    pkg1 = create_mock_package("pkg1", origin="Debian", label="Debian", suite="stable")
    pkg2 = create_mock_package("pkg2", origin="Debian", label="Debian", suite="testing")
    pkg3 = create_mock_package("pkg3", origin="Debian", label="Debian", suite="unstable")
    cache.__iter__ = MagicMock(return_value=iter([pkg1, pkg2, pkg3]))

    repos = parse_repositories(cache)

    assert len(repos) == 3

    repo_ids = {r.id for r in repos}
    assert "Debian:stable" in repo_ids
    assert "Debian:testing" in repo_ids
    assert "Debian:unstable" in repo_ids


def test_package_count_accuracy():
    """Package counts are accurate for each repository."""
    cache = MagicMock()
    # 3 packages from Debian:bookworm
    pkg1 = create_mock_package("pkg1", origin="Debian", label="Debian", suite="bookworm")
    pkg2 = create_mock_package("pkg2", origin="Debian", label="Debian", suite="bookworm")
    pkg3 = create_mock_package("pkg3", origin="Debian", label="Debian", suite="bookworm")
    # 2 packages from Hat Labs:stable
    pkg4 = create_mock_package("pkg4", origin="Hat Labs", label="hatlabs", suite="stable")
    pkg5 = create_mock_package("pkg5", origin="Hat Labs", label="hatlabs", suite="stable")

    cache.__iter__ = MagicMock(return_value=iter([pkg1, pkg2, pkg3, pkg4, pkg5]))

    repos = parse_repositories(cache)

    debian_repo = [r for r in repos if r.origin == "Debian"][0]
    hatlabs_repo = [r for r in repos if r.origin == "Hat Labs"][0]

    assert debian_repo.package_count == 3
    assert hatlabs_repo.package_count == 2

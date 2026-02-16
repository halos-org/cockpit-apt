"""
Pytest configuration and shared fixtures.
"""

from unittest.mock import MagicMock

import pytest


def pytest_configure(config):
    """Configure pytest to suppress OSError during capture cleanup.

    In container environments, pytest's capture plugin can encounter
    'Bad file descriptor' errors when closing temporary files during
    final cleanup. This happens after all tests pass and doesn't affect
    test results. We monkey-patch the cleanup to ignore this specific error.
    """
    from _pytest import capture

    original_done = capture.FDCapture.done

    def patched_done(self):
        try:
            original_done(self)
        except OSError as e:
            if e.errno == 9:  # Bad file descriptor
                pass  # Ignore in container environments
            else:
                raise

    capture.FDCapture.done = patched_done


@pytest.fixture(autouse=True)
def reset_apt_cache():
    """Ensure each test starts with clean state."""
    # No global state to reset yet, but this fixture can be extended
    # if we add caching or singletons later
    yield


class MockDependency:
    """Mock apt dependency for testing."""

    def __init__(self, name: str, relation: str = "", version: str = ""):
        self.name = name
        self.relation = relation
        self.version = version


class MockPackage:
    """Mock apt.Package for testing."""

    def __init__(
        self,
        name: str,
        summary: str = "Test package",
        description: str = "Test package description",
        version: str = "1.0.0",
        installed: bool = False,
        section: str = "utils",
        priority: str = "optional",
        homepage: str = "",
        maintainer: str = "Test Maintainer <test@example.com>",
        size: int = 1024,
        installed_size: int = 4096,
        dependencies: list[list[MockDependency]] | None = None,
        is_upgradable: bool = False,
        installed_version: str | None = None,
    ):
        self.name = name
        self.is_installed = installed
        self.is_upgradable = is_upgradable

        # Candidate version (available for install)
        self.candidate = MagicMock()
        self.candidate.summary = summary
        self.candidate.description = description
        self.candidate.version = version
        self.candidate.section = section
        self.candidate.priority = priority
        self.candidate.homepage = homepage
        self.candidate.size = size
        self.candidate.installed_size = installed_size
        self.candidate.record = {"Maintainer": maintainer}

        # Set up dependencies
        if dependencies:
            self.candidate.dependencies = dependencies
        else:
            self.candidate.dependencies = []

        # Installed version (if package is installed)
        if installed:
            self.installed = MagicMock()
            self.installed.version = installed_version if installed_version else version
            self.installed.summary = summary
            self.installed.section = section
        else:
            self.installed = None


class MockCache:
    """Mock apt.Cache for testing."""

    def __init__(self, packages: list[MockPackage]):
        self._packages = packages
        self._dict = {pkg.name: pkg for pkg in packages}

    def __iter__(self):
        return iter(self._packages)

    def __contains__(self, key: str):
        return key in self._dict

    def __getitem__(self, key: str):
        if key not in self._dict:
            raise KeyError(key)
        return self._dict[key]

    def upgrade(self):
        """Mock the upgrade() method that marks packages for upgrade."""
        # In real apt.Cache, this marks packages for upgrade
        # For our mock, is_upgradable is already set on packages
        pass


@pytest.fixture
def sample_packages():
    """Fixture providing a standard set of test packages."""
    return [
        MockPackage(
            "nginx",
            summary="HTTP server",
            description=(
                "Nginx is a web server with focus on high performance and low memory usage."
            ),
            version="1.18.0",
            installed=False,
            section="web",
            homepage="https://nginx.org",
            dependencies=[
                [MockDependency("libc6", ">=", "2.34")],
                [MockDependency("libssl3", ">=", "3.0.0")],
            ],
        ),
        MockPackage(
            "nginx-common",
            summary="Nginx common files",
            description="Common files for nginx web server.",
            version="1.18.0",
            installed=True,
            section="web",
        ),
        MockPackage(
            "apache2",
            summary="Apache HTTP Server",
            description="The Apache HTTP Server is a powerful and flexible web server.",
            version="2.4.52",
            installed=False,
            section="web",
            dependencies=[
                [MockDependency("libc6", ">=", "2.34")],
                [MockDependency("perl", "", "")],
            ],
        ),
        MockPackage(
            "python3",
            summary="Python 3 interpreter",
            description="Python is a high-level, general-purpose programming language.",
            version="3.11.2",
            installed=True,
            section="python",
        ),
        MockPackage(
            "python3-apt",
            summary="Python APT bindings",
            description="Python interface to libapt-pkg.",
            version="2.4.0",
            installed=True,
            section="python",
            dependencies=[
                [MockDependency("python3", ">=", "3.11")],
                [MockDependency("libapt-pkg6.0", ">=", "2.4.0")],
            ],
        ),
        MockPackage(
            "libc6",
            summary="GNU C Library",
            description="Core C library.",
            version="2.36",
            installed=True,
            section="libs",
        ),
        MockPackage(
            "vim",
            summary="Vi IMproved - enhanced vi editor",
            description="Vim is an almost compatible version of the UNIX editor Vi.",
            version="9.0.1000",
            installed=True,
            section="editors",
            is_upgradable=True,
            installed_version="9.0.0900",
        ),
        MockPackage(
            "emacs",
            summary="GNU Emacs editor",
            description="GNU Emacs is an extensible, customizable text editor.",
            version="28.2",
            installed=False,
            section="editors",
        ),
    ]


@pytest.fixture
def mock_apt_cache(sample_packages):
    """Fixture providing a mock APT cache with sample packages."""
    return MockCache(sample_packages)

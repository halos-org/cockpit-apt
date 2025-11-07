"""
Pytest configuration and shared fixtures.
"""

import pytest


@pytest.fixture(autouse=True)
def reset_apt_cache():
    """Ensure each test starts with clean state."""
    # No global state to reset yet, but this fixture can be extended
    # if we add caching or singletons later
    yield

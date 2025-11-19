#!/bin/bash
# Test script for version handling with DEP-14 compliant tags
# This script tests that our regex patterns correctly handle underscore-based pre-release tags

set -euo pipefail

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

TESTS_PASSED=0
TESTS_FAILED=0

# Test helper
assert_equal() {
    local expected="$1"
    local actual="$2"
    local test_name="$3"

    if [ "$expected" == "$actual" ]; then
        echo -e "${GREEN}✓${NC} $test_name"
        TESTS_PASSED=$((TESTS_PASSED + 1))
    else
        echo -e "${RED}✗${NC} $test_name"
        echo "  Expected: $expected"
        echo "  Got: $actual"
        TESTS_FAILED=$((TESTS_FAILED + 1))
    fi
}

echo "Testing version handling with DEP-14 compliant tags"
echo "===================================================="
echo

# Test 1: Regex pattern matches pre-release tags with underscore
echo "Test 1: Regex matches pre-release tags with underscore"
TAG="v0.2.0+1_pre"
if [[ $TAG =~ \+([0-9]+)(_.*)?$ ]]; then
    REVISION="${BASH_REMATCH[1]}"
    SUFFIX="${BASH_REMATCH[2]}"
    assert_equal "1" "$REVISION" "Extract revision from v0.2.0+1_pre"
    assert_equal "_pre" "$SUFFIX" "Extract suffix from v0.2.0+1_pre"
else
    echo -e "${RED}✗${NC} Regex failed to match v0.2.0+1_pre"
    TESTS_FAILED=$((TESTS_FAILED + 1))
fi
echo

# Test 2: Regex pattern matches stable tags
echo "Test 2: Regex matches stable tags"
TAG="v0.2.0+1"
if [[ $TAG =~ \+([0-9]+)(_.*)?$ ]]; then
    REVISION="${BASH_REMATCH[1]}"
    SUFFIX="${BASH_REMATCH[2]}"
    assert_equal "1" "$REVISION" "Extract revision from v0.2.0+1"
    assert_equal "" "$SUFFIX" "No suffix for stable tag"
else
    echo -e "${RED}✗${NC} Regex failed to match v0.2.0+1"
    TESTS_FAILED=$((TESTS_FAILED + 1))
fi
echo

# Test 3: Regex extracts correct revision from multiple tags
echo "Test 3: Extract max revision from list"
TAGS="v0.2.0+1_pre
v0.2.0+1
v0.2.0+2_pre
v0.2.0+2
v0.2.0+3_pre"

MAX_REVISION=0
while IFS= read -r tag; do
    if [[ $tag =~ \+([0-9]+)(_.*)?$ ]]; then
        REVISION="${BASH_REMATCH[1]}"
        if [ "$REVISION" -gt "$MAX_REVISION" ]; then
            MAX_REVISION="$REVISION"
        fi
    fi
done <<< "$TAGS"

assert_equal "3" "$MAX_REVISION" "Find maximum revision from tag list"
echo

# Test 4: Release.yml regex pattern
echo "Test 4: release.yml stable tag pattern"
STABLE_TAG="v0.2.0+2"
if [[ $STABLE_TAG =~ ^v([0-9]+\.[0-9]+\.[0-9]+)\+([0-9]+)$ ]]; then
    UPSTREAM="${BASH_REMATCH[1]}"
    REVISION="${BASH_REMATCH[2]}"
    assert_equal "0.2.0" "$UPSTREAM" "Extract upstream from stable tag"
    assert_equal "2" "$REVISION" "Extract revision from stable tag"
else
    echo -e "${RED}✗${NC} Stable tag pattern failed"
    TESTS_FAILED=$((TESTS_FAILED + 1))
fi
echo

# Test 5: Construct pre-release tag from stable tag components
echo "Test 5: Construct pre-release tag"
UPSTREAM="0.2.0"
REVISION="2"
PRERELEASE_TAG="v${UPSTREAM}+${REVISION}_pre"
assert_equal "v0.2.0+2_pre" "$PRERELEASE_TAG" "Build pre-release tag with underscore"
echo

# Test 6: DEP-14 unmangling (git tag → debian version)
echo "Test 6: DEP-14 unmangling for Debian changelog"
GIT_TAG="v0.2.0+2_pre"
# Remove 'v' prefix
VERSION_PART="${GIT_TAG#v}"
# For Debian changelog, we need: 0.2.0-2~pre
# Replace + with - (revision separator)
# Replace _ with ~ (pre-release marker) - use sed to avoid tilde expansion
DEBIAN_VERSION="${VERSION_PART/+/-}"
DEBIAN_VERSION=$(echo "$DEBIAN_VERSION" | sed 's/_/~/g')
assert_equal "0.2.0-2~pre" "$DEBIAN_VERSION" "Convert git tag to Debian version"
echo

# Test 7: Stable debian version (no suffix)
echo "Test 7: Stable Debian version"
GIT_TAG="v0.2.0+2"
VERSION_PART="${GIT_TAG#v}"
DEBIAN_VERSION="${VERSION_PART/+/-}"
DEBIAN_VERSION=$(echo "$DEBIAN_VERSION" | sed 's/_/~/g')
assert_equal "0.2.0-2" "$DEBIAN_VERSION" "Convert stable tag to Debian version"
echo

# Test 8: Version ordering
echo "Test 8: Version ordering (Debian dpkg --compare-versions)"
# Note: This test requires dpkg to be available
if command -v dpkg &> /dev/null; then
    # Test that pre-release sorts before stable
    if dpkg --compare-versions "0.2.0-1~pre" lt "0.2.0-1"; then
        echo -e "${GREEN}✓${NC} 0.2.0-1~pre < 0.2.0-1 (pre-release before stable)"
        TESTS_PASSED=$((TESTS_PASSED + 1))
    else
        echo -e "${RED}✗${NC} 0.2.0-1~pre should be less than 0.2.0-1"
        TESTS_FAILED=$((TESTS_FAILED + 1))
    fi

    # Test revision ordering
    if dpkg --compare-versions "0.2.0-1" lt "0.2.0-2~pre"; then
        echo -e "${GREEN}✓${NC} 0.2.0-1 < 0.2.0-2~pre (stable before next pre-release)"
        TESTS_PASSED=$((TESTS_PASSED + 1))
    else
        echo -e "${RED}✗${NC} 0.2.0-1 should be less than 0.2.0-2~pre"
        TESTS_FAILED=$((TESTS_FAILED + 1))
    fi
else
    echo "⚠️  Skipping dpkg version comparison tests (dpkg not available)"
fi
echo

# Summary
echo "===================================================="
echo "Test Summary"
echo "===================================================="
echo -e "Passed: ${GREEN}$TESTS_PASSED${NC}"
echo -e "Failed: ${RED}$TESTS_FAILED${NC}"
echo

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "${GREEN}All tests passed!${NC}"
    exit 0
else
    echo -e "${RED}Some tests failed${NC}"
    exit 1
fi

#!/usr/bin/env bash
#
# Pre-commit hook to prevent direct debian/changelog edits.
# Changelog updates must go through ./run bumpversion which uses dch
# to ensure proper RFC 2822 date formatting.
#
# Bypass: SKIP_CHANGELOG_CHECK=1 git commit ...

set -o errexit
set -o pipefail
set -o nounset

# Allow bypass for ./run bumpversion (via env var)
if [[ "${SKIP_CHANGELOG_CHECK:-}" == "1" ]]; then
    exit 0
fi

# Check if any debian/changelog files are staged
CHANGELOG_FILES=$(git diff --cached --name-only | grep -E 'debian/changelog$' || true)

if [[ -n "$CHANGELOG_FILES" ]]; then
    echo "ERROR: Direct debian/changelog edits are not allowed."
    echo ""
    echo "Staged changelog files:"
    echo "$CHANGELOG_FILES" | sed 's/^/  /'
    echo ""
    echo "Why: Manual changelog edits often have RFC 2822 date formatting errors"
    echo "(wrong weekday for date). The dch tool handles this correctly."
    echo ""
    echo "Solution: Use './run bumpversion [patch|minor|major]' which:"
    echo "  1. Updates VERSION file"
    echo "  2. Uses dch to update debian/changelog with correct dates"
    echo "  3. Commits the changes"
    echo ""
    echo "If you need to bypass this check (e.g., fixing a changelog):"
    echo "  SKIP_CHANGELOG_CHECK=1 git commit ..."
    echo ""
    exit 1
fi

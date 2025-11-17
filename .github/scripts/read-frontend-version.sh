#!/bin/bash
# Read version from frontend/package.json
# Sets version in GitHub output

set -e

VERSION=$(node -p "require('./frontend/package.json').version")
echo "version=$VERSION" >> "$GITHUB_OUTPUT"
echo "Version: $VERSION"

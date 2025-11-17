#!/bin/bash
# Read version from debian/changelog
# Sets version and tag_version in GitHub output

set -e

# Install devscripts if needed
if ! command -v dpkg-parsechangelog &> /dev/null; then
  sudo apt-get update -qq
  sudo apt-get install -y -qq devscripts
fi

VERSION=$(dpkg-parsechangelog -S Version)
# Strip Debian revision (everything after the last dash) for tag version
TAG_VERSION="${VERSION%-*}"

echo "version=$VERSION" >> "$GITHUB_OUTPUT"
echo "tag_version=$TAG_VERSION" >> "$GITHUB_OUTPUT"
echo "Version from debian/changelog: $VERSION (tag version: $TAG_VERSION)"

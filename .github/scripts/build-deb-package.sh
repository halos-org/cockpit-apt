#!/bin/bash
# Build Debian package (.deb)
# Assumes build dependencies are already installed

set -e

echo "Building Debian package..."

# Build the package
dpkg-buildpackage -b -uc -us

# List generated packages
echo "📦 Generated packages:"
ls -lh ../*.deb

echo "✅ Package build complete"

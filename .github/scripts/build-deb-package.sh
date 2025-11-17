#!/bin/bash
# Build Debian package (.deb) in debtools container
# Container has all build dependencies pre-installed

set -e

echo "Building Debian package in Debian trixie container..."

# Build the package inside debtools container
docker run --rm \
  -v "$(pwd):/workspace" \
  -w /workspace \
  debtools:latest \
  dpkg-buildpackage -b -uc -us

# List generated packages
echo "📦 Generated packages:"
ls -lh ../*.deb

echo "✅ Package build complete"

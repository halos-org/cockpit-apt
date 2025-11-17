#!/bin/bash
# Build frontend with npm
# Assumes Node.js is already set up and available

set -e

echo "Building frontend..."
cd frontend
npm ci
npm run build
cd ..
echo "✅ Frontend build complete"

#!/bin/bash

# Build script for deploying unified frontend as static site
# This builds directly to the docs folder for GitHub Pages
#
# Usage:
#   ./scripts/build-for-deployment-unified.sh
#   # or with custom basePath:
#   NEXT_PUBLIC_BASE_PATH="/your-custom-path" ./scripts/build-for-deployment-unified.sh

set -e

# Use NEXT_PUBLIC_BASE_PATH if set, otherwise default to /self-pylon-demo
BASE_PATH="${NEXT_PUBLIC_BASE_PATH:-/self-pylon-demo}"

echo "🚀 Building unified-web for GitHub Pages deployment..."
echo "📌 Using basePath: ${BASE_PATH}"

# Clean previous builds
echo "🧹 Cleaning previous builds..."
rm -rf docs/
mkdir -p docs

# Build unified-web directly to docs root
echo "📦 Building unified-web to docs/..."
cd apps/unified-web
OUTPUT_DIR=../../docs NEXT_PUBLIC_BASE_PATH="${BASE_PATH}" pnpm build
cd ../..

# Add .nojekyll file to bypass Jekyll processing
echo "📄 Adding .nojekyll file..."
touch docs/.nojekyll

echo "✅ Build complete! GitHub Pages directory structure:"
echo "docs/                  # Unified frontend (root)"
echo ""
echo "🚀 Ready for GitHub Pages deployment!"
echo "💡 Enable GitHub Pages in repo settings:"
echo "   - Source: Deploy from a branch"
echo "   - Branch: main"
echo "   - Folder: /docs"
echo ""
echo "🌐 Your app will be available at:"
echo "   - https://yourusername.github.io${BASE_PATH}/"
echo ""
echo "💡 To use a different basePath, set NEXT_PUBLIC_BASE_PATH:"
echo "   NEXT_PUBLIC_BASE_PATH=\"/your-path\" ./scripts/build-for-deployment-unified.sh"

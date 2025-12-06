#!/bin/bash

# Build script for deploying unified frontend as static site
# This builds directly to the docs folder for GitHub Pages

set -e

echo "🚀 Building unified-web for GitHub Pages deployment..."

# Clean previous builds
echo "🧹 Cleaning previous builds..."
rm -rf docs/
mkdir -p docs

# Build unified-web directly to docs root
echo "📦 Building unified-web to docs/..."
cd apps/unified-web
OUTPUT_DIR=../../docs pnpm build
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
echo "   - https://yourusername.github.io/self-pylon-demo/"

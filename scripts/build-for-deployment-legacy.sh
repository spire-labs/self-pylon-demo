#!/bin/bash

# Build script for deploying legacy frontends (attest-web and claim-web) as static sites
# This builds directly to the docs folder for GitHub Pages

set -e

echo "🚀 Building legacy frontends for GitHub Pages deployment..."

# Clean previous builds
echo "🧹 Cleaning previous builds..."
rm -rf docs/
mkdir -p docs

# Build attest-web directly to docs/attest
echo "📦 Building attest-web to docs/attest..."
cd apps/attest-web
OUTPUT_DIR=../../docs/attest pnpm build
cd ../..

# Build claim-web directly to docs/claim  
echo "📦 Building claim-web to docs/claim..."
cd apps/claim-web
OUTPUT_DIR=../../docs/claim pnpm build
cd ../..

# Add .nojekyll file to bypass Jekyll processing
echo "📄 Adding .nojekyll file..."
touch docs/.nojekyll

echo "✅ Build complete! GitHub Pages directory structure:"
echo "docs/"
echo "├── attest/            # Attest app (Celo L2 verification)"
echo "└── claim/             # Claim app (Pylon NFT minting)"
echo ""
echo "🚀 Ready for GitHub Pages deployment!"
echo "💡 Enable GitHub Pages in repo settings:"
echo "   - Source: Deploy from a branch"
echo "   - Branch: main"
echo "   - Folder: /docs"
echo ""
echo "🌐 Your apps will be available at:"
echo "   - https://yourusername.github.io/self-pylon-demo/attest/"
echo "   - https://yourusername.github.io/self-pylon-demo/claim/"

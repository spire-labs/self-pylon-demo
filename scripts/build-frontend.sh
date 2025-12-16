#!/bin/bash

# Build script for deploying frontend as static site
# This builds directly to the docs folder for GitHub Pages
#
# Usage:
#   ./scripts/build-frontend.sh
#   # or with custom basePath:
#   NEXT_PUBLIC_BASE_PATH="/your-custom-path" ./scripts/build-frontend.sh
#   # or with custom domain (creates CNAME file in docs/):
#   GITHUB_PAGES_CUSTOM_DOMAIN="human.spire.dev" ./scripts/build-frontend.sh

set -e

# Use NEXT_PUBLIC_BASE_PATH if set, otherwise default to empty (for custom domains)
BASE_PATH="${NEXT_PUBLIC_BASE_PATH:-}"

echo "🚀 Building frontend for GitHub Pages deployment..."
if [ -z "$BASE_PATH" ]; then
  echo "📌 Using basePath: (empty - for custom domain deployment)"
else
  echo "📌 Using basePath: ${BASE_PATH}"
fi

# Clean previous builds
echo "🧹 Cleaning previous builds..."
rm -rf docs/
mkdir -p docs

# Build frontend directly to docs root
echo "📦 Building frontend to docs/..."
cd frontend
OUTPUT_DIR=../docs NEXT_PUBLIC_BASE_PATH="${BASE_PATH}" pnpm build
cd ..

# Add .nojekyll file to bypass Jekyll processing
echo "📄 Adding .nojekyll file..."
touch docs/.nojekyll

# Create CNAME file in docs/ for custom domain (required when deploying from /docs folder)
if [ -n "$GITHUB_PAGES_CUSTOM_DOMAIN" ]; then
  echo "📝 Creating CNAME file in docs/ for ${GITHUB_PAGES_CUSTOM_DOMAIN}..."
  echo "$GITHUB_PAGES_CUSTOM_DOMAIN" > docs/CNAME
fi

echo "✅ Build complete! GitHub Pages directory structure:"
echo "docs/                  # Frontend (root)"
if [ -n "$GITHUB_PAGES_CUSTOM_DOMAIN" ]; then
  echo "docs/CNAME            # Custom domain: ${GITHUB_PAGES_CUSTOM_DOMAIN}"
fi
echo ""
echo "🚀 Ready for GitHub Pages deployment!"
echo "💡 Enable GitHub Pages in repo settings:"
echo "   - Source: Deploy from a branch"
echo "   - Branch: main"
echo "   - Folder: /docs"
echo ""
echo "🌐 Your app will be available at:"
if [ -n "$GITHUB_PAGES_CUSTOM_DOMAIN" ]; then
  echo "   - https://${GITHUB_PAGES_CUSTOM_DOMAIN}/"
  echo ""
  echo "📋 Next steps for custom domain setup:"
  echo "   1. Configure DNS: Add a CNAME record:"
  echo "      Name: human"
  echo "      Type: CNAME"
  echo "      Value: <your-username>.github.io (or your org's GitHub Pages domain)"
  echo "   2. Wait for DNS propagation (can take up to 24 hours)"
  echo "   3. In GitHub repo Settings → Pages → Custom domain, enter: ${GITHUB_PAGES_CUSTOM_DOMAIN}"
  echo "   4. GitHub will verify DNS and enable SSL automatically"
elif [ -z "$BASE_PATH" ]; then
  echo "   - https://your-custom-domain.com/ (when using custom domain)"
  echo "   - Or set NEXT_PUBLIC_BASE_PATH for repository path deployment"
else
  echo "   - https://yourusername.github.io${BASE_PATH}/"
fi
echo ""
echo "💡 To use a different basePath, set NEXT_PUBLIC_BASE_PATH:"
echo "   NEXT_PUBLIC_BASE_PATH=\"/your-path\" ./scripts/build-frontend.sh"
echo ""
echo "💡 To use a custom domain, set GITHUB_PAGES_CUSTOM_DOMAIN:"
echo "   GITHUB_PAGES_CUSTOM_DOMAIN=\"human.spire.dev\" ./scripts/build-frontend.sh"

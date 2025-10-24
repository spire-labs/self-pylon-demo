#!/bin/bash

# Build script for deploying both frontends as static sites
# This creates a single directory structure for GitHub Pages in /docs

set -e

echo "🚀 Building both frontends for GitHub Pages deployment..."

# Clean previous builds
echo "🧹 Cleaning previous builds..."
rm -rf docs/
mkdir -p docs

# Build attest-web
echo "📦 Building attest-web..."
cd apps/attest-web
pnpm build
cd ../..

# Build claim-web  
echo "📦 Building claim-web..."
cd apps/claim-web
pnpm build
cd ../..

# Copy build outputs to docs directory
echo "📁 Organizing build outputs..."
cp -r apps/attest-web/out docs/attest
cp -r apps/claim-web/out docs/claim

# Create a simple index.html that redirects to the apps
cat > docs/index.html << 'EOF'
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Self Pylon Demo</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            margin: 0;
            padding: 40px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .container {
            background: white;
            border-radius: 16px;
            padding: 40px;
            box-shadow: 0 20px 40px rgba(0,0,0,0.1);
            text-align: center;
            max-width: 600px;
        }
        h1 {
            color: #333;
            margin-bottom: 20px;
        }
        .apps {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            margin-top: 30px;
        }
        .app-link {
            display: block;
            padding: 20px;
            background: #f8f9fa;
            border-radius: 12px;
            text-decoration: none;
            color: #333;
            transition: all 0.3s ease;
            border: 2px solid transparent;
        }
        .app-link:hover {
            background: #e9ecef;
            border-color: #667eea;
            transform: translateY(-2px);
        }
        .app-title {
            font-weight: 600;
            margin-bottom: 8px;
        }
        .app-desc {
            color: #666;
            font-size: 14px;
        }
        @media (max-width: 600px) {
            .apps {
                grid-template-columns: 1fr;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>Self Pylon Demo</h1>
        <p>Choose an application to get started:</p>
        
        <div class="apps">
            <a href="/attest/" class="app-link">
                <div class="app-title">🔗 Self Attestation</div>
                <div class="app-desc">Verify your humanity on Celo L2</div>
            </a>
            
            <a href="/claim/" class="app-link">
                <div class="app-title">🎨 Claim Human NFT</div>
                <div class="app-desc">Mint your "I am human" NFT on Pylon</div>
            </a>
        </div>
    </div>
</body>
</html>
EOF

echo "✅ Build complete! GitHub Pages directory structure:"
echo "docs/"
echo "├── index.html          # Landing page with app selection"
echo "├── attest/            # Attest app (Celo L2 verification)"
echo "└── claim/             # Claim app (Pylon NFT minting)"
echo ""
echo "🚀 Ready for GitHub Pages deployment!"
echo "💡 Enable GitHub Pages in repo settings:"
echo "   - Source: Deploy from a branch"
echo "   - Branch: main"
echo "   - Folder: /docs"

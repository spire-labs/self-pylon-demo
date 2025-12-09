/** @type {import('next').NextConfig} */
// basePath is always applied (both dev and production)
// Set NEXT_PUBLIC_BASE_PATH to set a basePath (e.g., '/self-pylon-demo' for GitHub Pages)
// If not set, basePath defaults to '' (root path)
// When running locally with a basePath, access the app at http://localhost:PORT/basePath/

const nextConfig = {
  reactStrictMode: true,
  output: 'export',
  trailingSlash: true,
  distDir: process.env.OUTPUT_DIR || 'out',
  basePath: process.env.NEXT_PUBLIC_BASE_PATH?.trim() || '',
  assetPrefix: process.env.NEXT_PUBLIC_BASE_PATH?.trim() || '',
  experimental: {
    typedRoutes: true
  },
  webpack: (config, { isServer, webpack }) => {
    // pino-pretty is an optional dependency of pino (used by WalletConnect)
    // Since we're building a static export, we don't need it. Provide an empty module.
    config.resolve.alias = {
      ...config.resolve.alias,
      'pino-pretty': false,
    };
    
    // Prefix CSS URLs with basePath for @font-face and background-image
    // This ensures CSS assets work correctly with basePath
    const basePath = process.env.NEXT_PUBLIC_BASE_PATH?.trim() || '';
    if (!isServer && basePath) {
      // Custom plugin to replace CSS URLs with basePath
      class CSSBasePathPlugin {
        apply(compiler) {
          compiler.hooks.compilation.tap('CSSBasePathPlugin', (compilation) => {
            compilation.hooks.processAssets.tap(
              {
                name: 'CSSBasePathPlugin',
                stage: webpack.Compilation.PROCESS_ASSETS_STAGE_OPTIMIZE,
              },
              (assets) => {
                Object.keys(assets).forEach((filename) => {
                  if (filename.endsWith('.css')) {
                    const asset = assets[filename];
                    // Get source - handle both function and direct source
                    let source = asset.source();
                    if (Buffer.isBuffer(source)) {
                      source = source.toString('utf-8');
                    } else if (typeof source !== 'string') {
                      source = String(source);
                    }
                    
                    // Replace url('/path') with url('basePath/path')
                    // This handles @font-face and background-image URLs in CSS
                    const transformedSource = source.replace(
                      /url\(['"]?\/([^'")]+)['"]?\)/g,
                      (match, path) => {
                        // Don't replace URLs that are:
                        // - External (http/https)
                        // - Next.js internal (_next/)
                        // - Already prefixed with the current basePath
                        if (
                          path.startsWith('_next/') ||
                          path.startsWith('http') ||
                          (basePath && path.startsWith(basePath.slice(1) + '/'))
                        ) {
                          return match;
                        }
                        // Prefix with basePath (only if basePath is not empty)
                        return basePath ? `url('${basePath}/${path}')` : match;
                      }
                    );
                    
                    // Update the asset with transformed source
                    compilation.updateAsset(
                      filename,
                      new webpack.sources.RawSource(transformedSource)
                    );
                  }
                });
              }
            );
          });
        }
      }
      
      config.plugins.push(new CSSBasePathPlugin());
    }
    
    return config;
  },
};

export default nextConfig;





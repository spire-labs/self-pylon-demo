/** @type {import('next').NextConfig} */
const basePath = process.env.NEXT_PUBLIC_BASE_PATH?.trim() || '/self-pylon-demo';

const nextConfig = {
  reactStrictMode: true,
  output: 'export',
  trailingSlash: true,
  distDir: process.env.OUTPUT_DIR || 'out',
  basePath,
  assetPrefix: basePath,
  experimental: {
    typedRoutes: true
  },
  webpack: (config, { isServer }) => {
    // pino-pretty is an optional dependency of pino (used by WalletConnect)
    // Since we're building a static export, we don't need it. Provide an empty module.
    config.resolve.alias = {
      ...config.resolve.alias,
      'pino-pretty': false,
    };
    
    return config;
  },
};

export default nextConfig;





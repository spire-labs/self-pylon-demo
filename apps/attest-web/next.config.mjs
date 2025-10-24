/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'export',
  trailingSlash: true,
  distDir: process.env.OUTPUT_DIR || 'out',
  experimental: {
    typedRoutes: true
  }
};

export default nextConfig;


import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Build a standalone server bundle for Docker runtime
  output: 'standalone',
  // Ensure workspace packages are transpiled by Next.js
  transpilePackages: ['@influencerai/core-schemas', '@influencerai/sdk'],
};

export default nextConfig;

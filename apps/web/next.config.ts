import type { NextConfig } from 'next';

const isWindows = process.platform === 'win32';

const nextConfig: NextConfig = {
  // Build a standalone server bundle for Docker runtime (disabled on Windows to avoid symlink errors)
  ...(isWindows ? {} : { output: 'standalone' as const }),
  // Ensure workspace packages are transpiled by Next.js
  transpilePackages: ['@influencerai/core-schemas', '@influencerai/sdk'],
};

export default nextConfig;

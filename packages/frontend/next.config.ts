import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // shared-types ships as TypeScript source rather than a build artifact.
  transpilePackages: ['@blockwatch/shared-types'],
};

export default nextConfig;

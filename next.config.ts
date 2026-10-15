import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  experimental: {
    serverActions: { bodySizeLimit: '6mb' }, // KYC and site photo uploads go through server actions
  },
};

export default nextConfig;

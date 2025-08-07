import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
  serverExternalPackages: ['node-cron'],
  env: {
    SCHEDULER_ENABLED: process.env.SCHEDULER_ENABLED || 'true'
  }
};

export default nextConfig;
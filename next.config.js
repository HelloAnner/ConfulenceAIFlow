/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  serverExternalPackages: ['node-cron'],
  env: {
    SCHEDULER_ENABLED: process.env.SCHEDULER_ENABLED || 'true'
  }
};

export default nextConfig;
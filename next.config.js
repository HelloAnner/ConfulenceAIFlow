/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['node-cron'],
  env: {
    SCHEDULER_ENABLED: process.env.SCHEDULER_ENABLED || 'true'
  }
};

export default nextConfig;
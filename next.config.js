/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['node-cron']
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      // 在服务器端启动时初始化服务
      import('./lib/startup.js').then(({ initializeServices }) => {
        initializeServices().catch(console.error);
      });
    }
    return config;
  },
  env: {
    SCHEDULER_ENABLED: process.env.SCHEDULER_ENABLED || 'true'
  }
};

export default nextConfig;
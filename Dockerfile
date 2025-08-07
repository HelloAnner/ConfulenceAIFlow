# 使用官方 Node.js 18 Alpine 镜像作为基础镜像
FROM node:18-alpine AS base

# 安装依赖阶段
FROM base AS deps
# 检查 https://github.com/nodejs/docker-node/tree/b4117f9333da4138b03a546ec926ef50a31506c3#nodealpine 了解为什么可能需要 libc6-compat
# 使用国内镜像源加速包安装
RUN sed -i 's/dl-cdn.alpinelinux.org/mirrors.aliyun.com/g' /etc/apk/repositories && \
    apk add --no-cache libc6-compat
WORKDIR /app

# 复制npm配置和依赖文件
COPY .npmrc package.json package-lock.json* ./

# 安装依赖基于你的首选包管理器
RUN \
  if [ -f package-lock.json ]; then npm ci; \
  else echo "Lockfile not found." && exit 1; \
  fi

# 构建阶段
FROM base AS builder
WORKDIR /app

# 复制npm配置
COPY .npmrc ./

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# 设置环境变量
ENV NEXT_TELEMETRY_DISABLED 1
ENV NODE_OPTIONS="--max-old-space-size=4096"

# 构建应用
RUN npm run build

# 生产依赖阶段
FROM base AS prod-deps
WORKDIR /app

# 复制npm配置和依赖文件
COPY .npmrc package.json package-lock.json* ./

# 只安装生产依赖
RUN \
  if [ -f package-lock.json ]; then npm ci --only=production; \
  else echo "Lockfile not found." && exit 1; \
  fi

# 生产镜像，复制所有文件并运行 next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public

# 设置正确的权限
RUN mkdir .next && mkdir -p data
RUN chown nextjs:nodejs .next && chown nextjs:nodejs data

# 自动利用输出跟踪来减少镜像大小
# https://nextjs.org/docs/advanced-features/output-file-tracing
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# 复制生产依赖
COPY --from=prod-deps /app/node_modules ./node_modules

USER nextjs

EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

# 启动应用
CMD ["node", "server.js"]

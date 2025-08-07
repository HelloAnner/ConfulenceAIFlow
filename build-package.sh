#!/bin/bash

# 构建部署包脚本
# 用于生成可部署到服务器的包，避免拷贝全部源码

set -e

echo "开始构建部署包..."

# 清理之前的构建
rm -rf dist
mkdir -p dist

# 构建 Next.js 应用
echo "构建 Next.js 应用..."
npm run build

# 检查 standalone 输出是否存在
if [ ! -d ".next/standalone" ]; then
    echo "错误: .next/standalone 目录不存在，请确保 next.config.js 中设置了 output: 'standalone'"
    exit 1
fi

# 复制 standalone 输出
echo "复制 standalone 文件..."
cp -r .next/standalone/* dist/

cp .env.local dist/

cp -r data dist/

# 复制静态文件
echo "复制静态文件..."
mkdir -p dist/.next
cp -r .next/static dist/.next/

# 复制 public 文件
if [ -d "public" ]; then
    echo "复制 public 文件..."
    cp -r public dist/
fi

# 创建启动脚本
echo "创建启动脚本..."
cat > dist/start.sh << 'EOF'
#!/bin/bash

# 设置环境变量
export NODE_ENV=production
export PORT=${PORT:-3000}
export HOSTNAME=${HOSTNAME:-"0.0.0.0"}

# 启动应用
node server.js
EOF

chmod +x dist/start.sh

# 创建 package.json（仅包含运行时依赖）
echo "创建运行时 package.json..."
cat > dist/package.json << 'EOF'
{
  "name": "confluence-ai-flow",
  "version": "1.0.0",
  "description": "Confluence AI Flow Production Package",
  "main": "server.js",
  "scripts": {
    "start": "./start.sh"
  },
  "dependencies": {
    "next": "^14.0.0"
  }
}
EOF

# 创建部署说明
echo "创建部署说明..."
cat > dist/README.md << 'EOF'
# Confluence AI Flow 部署包

## 部署步骤

1. 将此目录上传到服务器
2. 确保服务器已安装 Node.js 18+
3. 运行启动脚本：
   ```bash
   chmod +x start.sh
   ./start.sh
   ```

## 环境变量

可以通过环境变量配置：
- `PORT`: 端口号（默认 3000）
- `HOSTNAME`: 主机名（默认 "0.0.0.0"）
- 其他应用相关的环境变量

## 文件结构

- `server.js`: Next.js 服务器入口文件
- `.next/`: Next.js 构建输出
- `public/`: 静态资源文件
- `start.sh`: 启动脚本
- `package.json`: 运行时依赖
EOF

# 创建压缩包
echo "创建压缩包..."
cd dist
tar -czf ../confluence-ai-flow-$(date +%Y%m%d-%H%M%S).tar.gz .
cd ..

echo "构建完成！"
echo "部署包位置: dist/"
echo "压缩包: confluence-ai-flow-*.tar.gz"
echo ""
echo "部署说明:"
echo "1. 将压缩包上传到服务器并解压"
echo "2. 运行 ./start.sh 启动应用"
echo "3. 应用将在端口 3000 上运行"
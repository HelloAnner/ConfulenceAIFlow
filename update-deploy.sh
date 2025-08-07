#!/bin/bash

# Docker 更新部署脚本
# 用于有新功能时的合理更新操作

set -e

echo "🚀 开始更新部署流程..."

# 检查是否有代码变更
echo "📋 检查代码变更..."
if git status --porcelain | grep -q .; then
    echo "⚠️  检测到未提交的代码变更，建议先提交代码"
    read -p "是否继续部署？(y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "❌ 部署已取消"
        exit 1
    fi
fi

# 停止现有容器
echo "🛑 停止现有容器..."
docker-compose down

# 选择更新策略
echo "📦 选择更新策略:"
echo "1) 快速更新 (仅重新构建，利用缓存)"
echo "2) 完全重建 (清除缓存，完全重新构建)"
echo "3) 仅重启 (不重新构建，适用于配置变更)"
read -p "请选择 (1-3): " -n 1 -r
echo

case $REPLY in
    1)
        echo "⚡ 执行快速更新..."
        # 重新构建镜像，利用Docker缓存
        docker-compose build
        ;;
    2)
        echo "🔄 执行完全重建..."
        # 清除构建缓存
        docker builder prune -f
        # 删除现有镜像
        docker-compose build --no-cache
        ;;
    3)
        echo "🔄 仅重启服务..."
        # 不重新构建，直接启动
        ;;
    *)
        echo "❌ 无效选择，默认执行快速更新"
        docker-compose build
        ;;
esac

# 启动服务
echo "🚀 启动服务..."
docker-compose up -d

# 等待服务启动
echo "⏳ 等待服务启动..."
sleep 5

# 检查服务状态
echo "🔍 检查服务状态..."
if curl -f http://localhost:30000/api/health > /dev/null 2>&1; then
    echo "✅ 服务启动成功！"
    echo "🌐 访问地址: http://localhost:30000"
else
    echo "❌ 服务启动失败，请检查日志:"
    echo "   docker-compose logs -f"
    exit 1
fi

# 显示容器状态
echo "📊 容器状态:"
docker-compose ps

echo "🎉 更新部署完成！"
echo ""
echo "💡 常用命令:"
echo "   查看日志: docker-compose logs -f"
echo "   停止服务: docker-compose down"
echo "   重启服务: docker-compose restart"
echo "   进入容器: docker-compose exec kms-ai-flow sh"
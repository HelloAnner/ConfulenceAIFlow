// 启动脚本 - 初始化所有服务
import configService from './configService.js';
import schedulerService from './schedulerService.js';

// 防止重复初始化的标志
let isInitialized = false;
let isInitializing = false;

// 启动应用程序时的初始化函数
export async function initializeServices() {
  // 如果已经初始化或正在初始化，直接返回
  if (isInitialized || isInitializing) {
    console.log('🔄 服务已初始化或正在初始化中，跳过重复初始化');
    return;
  }

  isInitializing = true;
  try {
    console.log('🚀 开始初始化 Confluence AI Flow 服务...');
    
    // 1. 初始化配置服务
    console.log('📁 初始化配置服务...');
    await configService.loadConfigs();
    console.log('✅ 配置服务初始化完成');
    
    // 2. 检查环境变量
    console.log('🔧 检查环境变量...');
    const requiredEnvVars = [
      'OPENAI_API_KEY',
      'CONFLUENCE_BASE_URL',
      'CONFLUENCE_USERNAME',
      'CONFLUENCE_API_TOKEN'
    ];
    
    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
    if (missingVars.length > 0) {
      console.warn('⚠️  缺少以下环境变量:', missingVars.join(', '));
      console.warn('⚠️  某些功能可能无法正常工作，请检查 .env.local 文件');
    } else {
      console.log('✅ 环境变量检查完成');
    }
    
    // 3. 启动调度器（如果启用）
    if (process.env.SCHEDULER_ENABLED === 'true') {
      console.log('⏰ 启动任务调度器...');
      // 延迟启动调度器，确保其他服务已完全初始化
      setTimeout(async () => {
        await schedulerService.start();
        console.log('✅ 任务调度器启动完成');
      }, 2000);
    } else {
      console.log('⏰ 任务调度器已禁用');
    }
    
    // 4. 显示启动信息
    const configs = await configService.getAllConfigs();
    console.log(`📊 已加载 ${configs.length} 个配置`);
    
    let activeConfigsCount = 0;
    if (process.env.SCHEDULER_ENABLED === 'true') {
      const activeConfigs = await configService.getActiveConfigs();
      activeConfigsCount = activeConfigs.length;
      console.log(`⚡ 其中 ${activeConfigsCount} 个配置具有定时任务`);
    }
    
    console.log('🎉 Confluence AI Flow 服务初始化完成!');
    console.log('🌐 应用程序已准备就绪');
    
    // 标记初始化完成
    isInitialized = true;
    isInitializing = false;

    return {
      success: true,
      configsLoaded: configs.length,
      schedulerEnabled: process.env.SCHEDULER_ENABLED === 'true',
      activeJobs: activeConfigsCount
    };
    
  } catch (error) {
    console.error('❌ 服务初始化失败:', error);
    isInitializing = false; // 重置初始化状态
    throw error;
  }
}

// 优雅关闭函数
export async function shutdownServices() {
  try {
    console.log('🛑 开始关闭服务...');
    
    // 停止调度器
    if (schedulerService.isRunning) {
      console.log('⏰ 停止任务调度器...');
      schedulerService.stop();
      console.log('✅ 任务调度器已停止');
    }
    
    // 保存配置（如果有未保存的更改）
    console.log('💾 保存配置...');
    await configService.saveConfigs();
    console.log('✅ 配置已保存');
    
    console.log('✅ 服务关闭完成');
    
  } catch (error) {
    console.error('❌ 服务关闭失败:', error);
    throw error;
  }
}

// 处理进程退出信号
if (typeof process !== 'undefined') {
  process.on('SIGINT', async () => {
    console.log('\n收到 SIGINT 信号，开始优雅关闭...');
    try {
      await shutdownServices();
      process.exit(0);
    } catch (error) {
      console.error('关闭过程中发生错误:', error);
      process.exit(1);
    }
  });
  
  process.on('SIGTERM', async () => {
    console.log('\n收到 SIGTERM 信号，开始优雅关闭...');
    try {
      await shutdownServices();
      process.exit(0);
    } catch (error) {
      console.error('关闭过程中发生错误:', error);
      process.exit(1);
    }
  });
}

// 健康检查函数
export async function healthCheck() {
  try {
    const configs = await configService.getAllConfigs();
    const schedulerStatus = schedulerService.isRunning ? await schedulerService.getAllJobsStatus() : null;
    
    const status = {
      timestamp: new Date().toISOString(),
      services: {
        configService: {
          status: 'running',
          configsCount: configs.length
        },
        schedulerService: {
          status: schedulerService.isRunning ? 'running' : 'stopped',
          jobsCount: schedulerStatus ? schedulerStatus.totalJobs : 0
        }
      },
      environment: {
        nodeEnv: process.env.NODE_ENV || 'development',
        schedulerEnabled: process.env.SCHEDULER_ENABLED === 'true',
        hasOpenAIKey: !!process.env.OPENAI_API_KEY,
        hasConfluenceConfig: !!(process.env.CONFLUENCE_BASE_URL && process.env.CONFLUENCE_USERNAME && process.env.CONFLUENCE_API_TOKEN)
      }
    };
    
    return {
      success: true,
      status: 'healthy',
      data: status
    };
    
  } catch (error) {
    return {
      success: false,
      status: 'unhealthy',
      error: error.message
    };
  }
}
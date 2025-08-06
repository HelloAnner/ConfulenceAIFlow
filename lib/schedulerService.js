import cron from 'node-cron';
import crypto from 'crypto';
import AIService from './aiService.js';
import configService from './configService.js';
import ConfluenceService from './confluenceService.js';
import NotificationService from './notificationService.js';

class SchedulerService {
  constructor() {
    this.jobs = new Map(); // 存储所有定时任务
    this.confluenceService = new ConfluenceService();
    this.aiService = new AIService();
    this.notificationService = new NotificationService();
    this.isRunning = false;
  }

  // 启动调度器
  start() {
    if (this.isRunning) {
      console.log('调度器已经在运行中');
      return;
    }

    console.log('启动调度器...');
    this.loadAllJobs();
    this.isRunning = true;
    console.log('调度器启动成功');
  }

  // 停止调度器
  stop() {
    if (!this.isRunning) {
      console.log('调度器未运行');
      return;
    }

    console.log('停止调度器...');
    this.jobs.forEach((job, configId) => {
      job.destroy();
      console.log(`已停止配置 ${configId} 的定时任务`);
    });
    this.jobs.clear();
    this.isRunning = false;
    console.log('调度器已停止');
  }

  // 重启调度器
  restart() {
    this.stop();
    setTimeout(() => {
      this.start();
    }, 1000);
  }

  // 加载所有活跃配置的定时任务
  loadAllJobs() {
    const activeConfigs = configService.getActiveConfigs();
    console.log(`加载 ${activeConfigs.length} 个活跃配置的定时任务`);

    activeConfigs.forEach(config => {
      this.addJob(config);
    });
  }

  // 添加单个定时任务
  addJob(config) {
    try {
      if (!config.cronExpression) {
        console.warn(`配置 ${config.id} 没有设置 cron 表达式，跳过`);
        return;
      }

      // 验证 cron 表达式
      if (!cron.validate(config.cronExpression)) {
        console.error(`配置 ${config.id} 的 cron 表达式无效: ${config.cronExpression}`);
        return;
      }

      // 如果已存在该配置的任务，先删除
      if (this.jobs.has(config.id)) {
        this.removeJob(config.id);
      }

      // 创建新的定时任务
      const job = cron.schedule(config.cronExpression, async () => {
        await this.executeTask(config);
      }, {
        scheduled: true,
        timezone: 'Asia/Shanghai'
      });

      this.jobs.set(config.id, job);
      console.log(`已添加配置 ${config.id} (${config.title}) 的定时任务: ${config.cronExpression}`);

    } catch (error) {
      console.error(`添加定时任务失败 (配置 ${config.id}):`, error);
    }
  }

  // 移除定时任务
  removeJob(configId) {
    const job = this.jobs.get(configId);
    if (job) {
      job.destroy();
      this.jobs.delete(configId);
      console.log(`已移除配置 ${configId} 的定时任务`);
    }
  }

  // 更新定时任务
  updateJob(config) {
    this.removeJob(config.id);
    if (config.status === 'active' && config.cronExpression) {
      this.addJob(config);
    }
  }

  // 执行单个任务
  async executeTask(config) {
    const startTime = Date.now();
    console.log(`开始执行任务: ${config.title} (ID: ${config.id})`);

    try {
      // 1. 获取 Confluence 内容
      console.log(`获取 Confluence 内容: ${config.confluenceUrl}`);
      const confluenceData = await this.confluenceService.getContentByType(
        config.confluenceUrl,
        config.pageType || 'current'
      );

      // 2. 格式化内容用于 AI 分析
      const formattedContent = this.confluenceService.formatPagesForAI(confluenceData);

      // 3. AI 分析
      console.log('开始 AI 分析...');
      const analysisResult = await this.aiService.analyzeContent(
        formattedContent,
        config.description
      );

      // 4. 发送通知
      let notificationResult = null;
      if (config.notificationType && config.webhookUrl) {
        console.log(`发送 ${config.notificationType} 通知...`);
        
        // 使用通知模板，替换{{content}}占位符
        let notificationContent = analysisResult;
        if (config.notificationTemplate) {
          notificationContent = config.notificationTemplate.replace('{{content}}', analysisResult);
        }
        
        notificationResult = await this.notificationService.sendNotification(
          config.notificationType,
          config.webhookUrl,
          notificationContent,
          `${config.title} - AI 分析结果`
        );
      }

      // 5. 记录执行结果
      const executionTime = Date.now() - startTime;
      const executionRecord = {
        configId: config.id,
        configTitle: config.title,
        executedAt: new Date().toISOString(),
        executionTime: `${executionTime}ms`,
        confluenceData: {
          pageType: confluenceData.pageType,
          totalPages: confluenceData.totalPages,
          retrievedAt: confluenceData.retrievedAt
        },
        analysisResult,
        notificationResult,
        status: 'success'
      };

      // 保存执行记录（可以扩展为保存到数据库）
      await this.saveExecutionRecord(executionRecord);

      console.log(`任务执行成功: ${config.title} (耗时: ${executionTime}ms)`);
      return executionRecord;

    } catch (error) {
      const executionTime = Date.now() - startTime;
      console.error(`任务执行失败: ${config.title}`, error);

      // 记录失败信息
      const errorRecord = {
        configId: config.id,
        configTitle: config.title,
        executedAt: new Date().toISOString(),
        executionTime: `${executionTime}ms`,
        error: error.message,
        status: 'failed'
      };

      await this.saveExecutionRecord(errorRecord);
      
      // 可以考虑发送错误通知
      if (config.notificationType && config.webhookUrl) {
        try {
          await this.notificationService.sendNotification(
            config.notificationType,
            config.webhookUrl,
            `❌ 任务执行失败\n\n**配置**: ${config.title}\n**错误**: ${error.message}\n**时间**: ${new Date().toLocaleString('zh-CN')}`,
            `${config.title} - 执行失败`
          );
        } catch (notifyError) {
          console.error('发送错误通知失败:', notifyError);
        }
      }

      throw error;
    }
  }

  // 手动执行任务
  async executeTaskManually(configId) {
    const config = configService.getConfigById(configId);
    if (!config) {
      throw new Error(`配置不存在: ${configId}`);
    }

    console.log(`手动执行任务: ${config.title}`);
    return await this.executeTask(config);
  }

  // 保存执行记录
  async saveExecutionRecord(record) {
    try {
      // 这里可以扩展为保存到数据库
      // 目前简单保存到文件
      const fs = await import('fs-extra');
      const path = await import('path');
      
      const recordsDir = path.resolve('./data/execution-records');
      await fs.ensureDir(recordsDir);
      
      const filename = `${record.configId}-${new Date().toISOString().split('T')[0]}.json`;
      const filepath = path.join(recordsDir, filename);
      
      let records = [];
      if (await fs.pathExists(filepath)) {
        records = await fs.readJson(filepath);
      }
      
      records.push(record);
      await fs.writeJson(filepath, records, { spaces: 2 });
      
      console.log(`执行记录已保存: ${filepath}`);
    } catch (error) {
      console.error('保存执行记录失败:', error);
    }
  }

  // 获取任务状态
  getJobStatus(configId) {
    const job = this.jobs.get(configId);
    if (!job) {
      return { exists: false };
    }

    return {
      exists: true,
      running: job.running,
      scheduled: job.scheduled
    };
  }

  // 获取所有任务状态
  getAllJobsStatus() {
    const status = {
      schedulerRunning: this.isRunning,
      totalJobs: this.jobs.size,
      jobs: []
    };

    this.jobs.forEach((job, configId) => {
      const config = configService.getConfigById(configId);
      status.jobs.push({
        configId,
        configTitle: config?.title || 'Unknown',
        cronExpression: config?.cronExpression,
        running: job.running,
        scheduled: job.scheduled
      });
    });

    return status;
  }

  // 计算下次执行时间
  getNextRunTime(cronExpression) {
    try {
      if (!cron.validate(cronExpression)) {
        return '无效的 cron 表达式';
      }

      // 这里需要使用第三方库来计算下次执行时间
      // 简单实现：返回当前时间加1小时（实际应该根据cron表达式计算）
      const nextRun = new Date();
      nextRun.setHours(nextRun.getHours() + 1);
      return nextRun.toLocaleString('zh-CN');
    } catch (error) {
      return '计算失败';
    }
  }
}

// 创建单例实例
const schedulerService = new SchedulerService();

// 如果启用了调度器，自动启动
if (process.env.SCHEDULER_ENABLED === 'true') {
  // 延迟启动，确保其他服务已初始化
  setTimeout(() => {
    schedulerService.start();
  }, 2000);
}

export default schedulerService;
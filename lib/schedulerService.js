import cron from 'node-cron';
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
  async start() {
    if (this.isRunning) {
      console.log('调度器已经在运行中');
      return;
    }

    console.log('启动调度器...');
    await this.loadAllJobs();
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
  async restart() {
    this.stop();
    setTimeout(async () => {
      await this.start();
    }, 1000);
  }

  // 加载所有活跃配置的定时任务
  async loadAllJobs() {
    const activeConfigs = await configService.getActiveConfigs();
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
      console.log(config);

      // 2. AI 分析
      console.log('开始 AI 分析...');
      const analysisResult = await this.aiService.analyzeContent(
        confluenceData,
        config.description
      );

      // 3. 发送通知
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
          `${config.title}`
        );
      }

      // 5. 记录执行结果
      const executionTime = Date.now() - startTime;
      const executionRecord = {
        configId: config.id,
        configTitle: config.title,
        executedAt: new Date().toISOString(),
        executionTime: `${executionTime}ms`,
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
    const config = await configService.getConfigById(configId);
    if (!config) {
      throw new Error(`配置不存在: ${configId}`);
    }

    console.log(`手动执行任务: ${config.title}`);
    return await this.executeTask(config);
  }

  // 保存执行记录
  async saveExecutionRecord(record) {
    try {
      const fs = await import('fs-extra');
      const path = await import('path');
      
      const recordsDir = path.resolve('./data/execution-records');
      await fs.ensureDir(recordsDir);
      
      // 为每个配置创建单独的目录
      const configDir = path.join(recordsDir, `config-${record.configId}`);
      await fs.ensureDir(configDir);
      
      // 按年月组织文件
      const date = new Date();
      const yearMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const filename = `${yearMonth}.json`;
      const filepath = path.join(configDir, filename);
      
      // 添加记录ID和更多元数据
      const enhancedRecord = {
        ...record,
        id: `${record.configId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        createdAt: new Date().toISOString(),
        version: '1.0'
      };
      
      let records = [];
      if (await fs.pathExists(filepath)) {
        try {
          records = await fs.readJson(filepath);
        } catch (error) {
          console.error(`读取记录文件失败: ${filepath}`, error);
          records = [];
        }
      }
      
      // 将新记录添加到数组开头（最新的在前）
      records.unshift(enhancedRecord);
      
      // 限制单个文件最多保存1000条记录，超出则创建新文件
      if (records.length > 1000) {
        const oldRecords = records.slice(1000);
        records = records.slice(0, 1000);
        
        // 将旧记录保存到归档文件
        const archiveFilename = `${yearMonth}-archive-${Date.now()}.json`;
        const archiveFilepath = path.join(configDir, archiveFilename);
        await fs.writeJson(archiveFilepath, oldRecords, { spaces: 2 });
        console.log(`旧记录已归档: ${archiveFilepath}`);
      }
      
      await fs.writeJson(filepath, records, { spaces: 2 });
      
      // 更新配置的统计信息
      await this.updateConfigStats(record.configId, enhancedRecord);
      
      console.log(`执行记录已保存: ${filepath}`);
    } catch (error) {
      console.error('保存执行记录失败:', error);
    }
  }

  // 更新配置统计信息
  async updateConfigStats(configId, record) {
    try {
      const fs = await import('fs-extra');
      const path = await import('path');
      
      const statsDir = path.resolve('./data/execution-records');
      const statsFile = path.join(statsDir, `config-${configId}`, 'stats.json');
      
      let stats = {
        configId,
        totalExecutions: 0,
        successfulExecutions: 0,
        failedExecutions: 0,
        lastExecution: null,
        lastSuccessfulExecution: null,
        lastFailedExecution: null,
        averageExecutionTime: 0,
        updatedAt: new Date().toISOString()
      };
      
      if (await fs.pathExists(statsFile)) {
        try {
          stats = await fs.readJson(statsFile);
        } catch (error) {
          console.error('读取统计文件失败:', error);
        }
      }
      
      // 更新统计信息
      stats.totalExecutions++;
      stats.lastExecution = record.executedAt;
      stats.updatedAt = new Date().toISOString();
      
      if (record.status === 'success') {
        stats.successfulExecutions++;
        stats.lastSuccessfulExecution = record.executedAt;
      } else {
        stats.failedExecutions++;
        stats.lastFailedExecution = record.executedAt;
      }
      
      // 计算平均执行时间
      if (record.executionTime) {
        const timeMs = parseInt(record.executionTime.replace('ms', ''));
        if (!isNaN(timeMs)) {
          stats.averageExecutionTime = Math.round(
            (stats.averageExecutionTime * (stats.totalExecutions - 1) + timeMs) / stats.totalExecutions
          );
        }
      }
      
      await fs.writeJson(statsFile, stats, { spaces: 2 });
    } catch (error) {
      console.error('更新配置统计信息失败:', error);
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
  async getAllJobsStatus() {
    const status = {
      schedulerRunning: this.isRunning,
      totalJobs: this.jobs.size,
      jobs: []
    };

    const jobPromises = [];
    this.jobs.forEach((job, configId) => {
      jobPromises.push(
        configService.getConfigById(configId).then(config => ({
          configId,
          configTitle: config?.title || 'Unknown',
          cronExpression: config?.cronExpression,
          running: job.running,
          scheduled: job.scheduled
        }))
      );
    });

    status.jobs = await Promise.all(jobPromises);
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
  setTimeout(async () => {
    await schedulerService.start();
  }, 2000);
}

export default schedulerService;
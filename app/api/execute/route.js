import { NextResponse } from 'next/server';
import AIService from '../../../lib/aiService.js';
import ConfluenceService from '../../../lib/confluenceService.js';
import NotificationService from '../../../lib/notificationService.js';

// 初始化服务实例
const confluenceService = new ConfluenceService();
const aiService = new AIService();
const notificationService = new NotificationService();

// POST - 执行Confluence AI任务
export async function POST(request) {
  const startTime = Date.now();
  
  try {
    const body = await request.json();
    const { configId, confluenceUrl, description, notificationType, webhookUrl, pageType, manual = false } = body;

    // 验证必填字段
    if (!confluenceUrl || !description) {
      return NextResponse.json(
        { success: false, error: '缺少必要的配置信息' },
        { status: 400 }
      );
    }

    console.log(`开始执行AI任务 - 配置ID: ${configId || 'manual'}, 手动执行: ${manual}`);

    // 1. 获取 Confluence 内容
    console.log(`获取 Confluence 内容: ${confluenceUrl}`);
    const confluenceData = await confluenceService.getContentByType(
      confluenceUrl,
      pageType || 'current'
    );

    // 2. 格式化内容用于 AI 分析
    const formattedContent = confluenceService.formatPagesForAI(confluenceData);
    console.log(`已格式化 ${confluenceData.totalPages} 个页面的内容`);

    // 3. AI 分析
    console.log('开始 AI 分析...');
    const analysisResult = await aiService.analyzeContent(formattedContent, description);
    console.log('AI 分析完成');

    // 4. 发送通知
    let notificationResult = null;
    if (notificationType && webhookUrl) {
      console.log(`发送 ${notificationType} 通知...`);
      const title = configId ?
        `配置 ${configId} - AI 分析结果` :
        'Confluence AI 分析结果';

      notificationResult = await notificationService.sendNotification(
        notificationType,
        webhookUrl,
        analysisResult,
        title
      );
    }

    // 5. 计算执行时间
    const executionTime = Date.now() - startTime;

    // 6. 构建返回结果
    const result = {
      configId: configId || null,
      manual,
      confluenceData: {
        url: confluenceUrl,
        pageType: confluenceData.pageType,
        totalPages: confluenceData.totalPages,
        retrievedAt: confluenceData.retrievedAt
      },
      analysisResult,
      notificationResult,
      executionTime: `${executionTime}ms`,
      executedAt: new Date().toISOString()
    };

    console.log(`AI任务执行成功 - 耗时: ${executionTime}ms`);

    return NextResponse.json({
      success: true,
      data: result,
      message: 'AI任务执行成功'
    });

  } catch (error) {
    const executionTime = Date.now() - startTime;
    console.error('执行AI任务失败:', error);

    return NextResponse.json(
      {
        success: false,
        error: '执行AI任务失败: ' + error.message,
        executionTime: `${executionTime}ms`,
        executedAt: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

// GET - 手动执行指定配置的任务
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const configId = parseInt(searchParams.get('configId'));
    const action = searchParams.get('action');

    if (action === 'execute' && configId) {
      // 手动执行任务
      const result = await schedulerService.executeTaskManually(configId);

      return NextResponse.json({
        success: true,
        data: result,
        message: '手动执行任务成功'
      });
    }

    if (action === 'status') {
      // 获取调度器状态
      const status = schedulerService.getAllJobsStatus();

      return NextResponse.json({
        success: true,
        data: status,
        message: '获取调度器状态成功'
      });
    }

    return NextResponse.json(
      { success: false, error: '无效的操作或参数' },
      { status: 400 }
    );

  } catch (error) {
    console.error('操作失败:', error);
    return NextResponse.json(
      { success: false, error: '操作失败: ' + error.message },
      { status: 500 }
    );
  }
}
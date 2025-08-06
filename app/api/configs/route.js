import configService from '@/lib/configService';
import schedulerService from '@/lib/schedulerService';
import { NextResponse } from 'next/server';

// GET - 获取所有配置
export async function GET() {
  try {
    const configs = configService.getAllConfigs();
    return NextResponse.json({ 
      success: true, 
      data: configs 
    });
  } catch (error) {
    console.error('获取配置失败:', error);
    return NextResponse.json(
      { success: false, error: '获取配置失败' },
      { status: 500 }
    );
  }
}


export async function POST(request) {
  try {
    const body = await request.json();
    const { title, confluenceUrl, description, notificationType, webhookUrl, notificationTemplate, pageType, cronExpression } = body;

    // 验证必填字段
    if (!title || !confluenceUrl || !description) {
      return NextResponse.json(
        { success: false, error: '请填写所有必填字段' },
        { status: 400 }
      );
    }

    // 创建新配置
    const configData = {
      title,
      confluenceUrl,
      description,
      notificationType: notificationType || 'wechat',
      webhookUrl: webhookUrl || '',
      notificationTemplate: notificationTemplate || '📋 AI分析报告\n\n{{content}}',
      pageType: pageType || 'current',
      cronExpression: cronExpression || ''
    };

    const newConfig = await configService.addConfig(configData);
    
    // 如果调度器正在运行，添加新任务
    if (schedulerService.isRunning && newConfig.cronExpression) {
      schedulerService.addJob(newConfig);
    }

    return NextResponse.json({
      success: true,
      data: newConfig,
      message: '配置创建成功'
    });
  } catch (error) {
    console.error('创建配置失败:', error);
    return NextResponse.json(
      { success: false, error: '创建配置失败: ' + error.message },
      { status: 500 }
    );
  }
}

// PUT - 更新配置
export async function PUT(request) {
  try {
    const body = await request.json();
    const { id, title, confluenceUrl, description, notificationType, webhookUrl, notificationTemplate, pageType, cronExpression } = body;

    // 验证必填字段
    if (!id || !title || !confluenceUrl || !description) {
      return NextResponse.json(
        { success: false, error: '请填写所有必填字段' },
        { status: 400 }
      );
    }

    // 更新配置
    const updateData = {
      title,
      confluenceUrl,
      description,
      notificationType: notificationType || 'wechat',
      webhookUrl: webhookUrl || '',
      notificationTemplate: notificationTemplate || '📋 AI分析报告\n\n{{content}}',
      pageType: pageType || 'current',
      cronExpression: cronExpression || ''
    };

    const updatedConfig = await configService.updateConfig(id, updateData);

    // 更新调度器中的任务
    if (schedulerService.isRunning) {
      schedulerService.updateJob(updatedConfig);
    }

    return NextResponse.json({
      success: true,
      data: updatedConfig,
      message: '配置更新成功'
    });
  } catch (error) {
    console.error('更新配置失败:', error);
    if (error.message === '配置不存在') {
      return NextResponse.json(
        { success: false, error: '配置不存在' },
        { status: 404 }
      );
    }
    return NextResponse.json(
      { success: false, error: '更新配置失败: ' + error.message },
      { status: 500 }
    );
  }
}

// DELETE - 删除配置
export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = parseInt(searchParams.get('id'));

    if (!id) {
      return NextResponse.json(
        { success: false, error: '缺少配置ID' },
        { status: 400 }
      );
    }

    // 删除配置
    const deletedConfig = await configService.deleteConfig(id);

    // 从调度器中移除任务
    if (schedulerService.isRunning) {
      schedulerService.removeJob(id);
    }

    return NextResponse.json({
      success: true,
      data: deletedConfig,
      message: '配置删除成功'
    });
  } catch (error) {
    console.error('删除配置失败:', error);
    if (error.message === '配置不存在') {
      return NextResponse.json(
        { success: false, error: '配置不存在' },
        { status: 404 }
      );
    }
    return NextResponse.json(
      { success: false, error: '删除配置失败: ' + error.message },
      { status: 500 }
    );
  }
}
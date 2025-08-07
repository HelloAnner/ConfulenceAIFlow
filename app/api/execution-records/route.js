import { NextResponse } from 'next/server';
import fs from 'fs-extra';
import path from 'path';
import schedulerService from '../../../lib/schedulerService.js';

// GET - 获取指定配置的执行记录
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const configId = searchParams.get('configId');
    
    if (!configId) {
      return NextResponse.json(
        { success: false, error: '缺少配置ID参数' },
        { status: 400 }
      );
    }

    // 获取执行记录
    const records = await getExecutionRecords(configId);
    
    // 获取下次执行时间
    const nextRunTime = await getNextRunTime(configId);
    
    return NextResponse.json({
      success: true,
      data: {
        records,
        nextRunTime
      }
    });

  } catch (error) {
    console.error('获取执行记录失败:', error);
    return NextResponse.json(
      { success: false, error: '获取执行记录失败: ' + error.message },
      { status: 500 }
    );
  }
}

// 获取指定配置的执行记录
async function getExecutionRecords(configId) {
  try {
    const recordsDir = path.resolve('./data/execution-records');
    
    // 确保目录存在
    await fs.ensureDir(recordsDir);
    
    // 获取所有相关的记录文件
    const files = await fs.readdir(recordsDir);
    const configFiles = files.filter(file => 
      file.startsWith(`${configId}-`) && file.endsWith('.json')
    );
    
    let allRecords = [];
    
    // 读取所有相关文件的记录
    for (const file of configFiles) {
      const filepath = path.join(recordsDir, file);
      try {
        const records = await fs.readJson(filepath);
        allRecords = allRecords.concat(records);
      } catch (error) {
        console.error(`读取记录文件失败: ${file}`, error);
      }
    }
    
    // 按执行时间倒序排列（最新的在前）
    allRecords.sort((a, b) => new Date(b.executedAt) - new Date(a.executedAt));
    
    // 限制返回最近100条记录
    return allRecords.slice(0, 100);
    
  } catch (error) {
    console.error('获取执行记录失败:', error);
    return [];
  }
}

// 获取下次执行时间
async function getNextRunTime(configId) {
  try {
    const jobStatus = schedulerService.getJobStatus(configId);
    if (!jobStatus.exists) {
      return null;
    }
    
    // 从配置服务获取配置信息
    const { default: configService } = await import('../../../lib/configService.js');
    const config = await configService.getConfigById(parseInt(configId));
    
    if (!config || !config.cronExpression) {
      return null;
    }
    
    // 使用调度器服务计算下次执行时间
    return schedulerService.getNextRunTime(config.cronExpression);
    
  } catch (error) {
    console.error('获取下次执行时间失败:', error);
    return null;
  }
}
import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs-extra';
import path from 'path';
import schedulerService from '../../../lib/schedulerService';

// GET - 获取指定配置的执行记录
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const configId = searchParams.get('configId');
    const page = parseInt(searchParams.get('page') || '1') || 1;
    const pageSize = parseInt(searchParams.get('pageSize') || '10') || 10;
    
    if (!configId) {
      return NextResponse.json(
        { success: false, error: '缺少配置ID参数' },
        { status: 400 }
      );
    }

    // 获取执行记录（支持分页）
    const result = await getExecutionRecords(configId, page, pageSize);
    
    // 获取下次执行时间
    const nextRunTime = await getNextRunTime(configId);
    
    // 获取统计信息
    const stats = await getConfigStats(configId);
    
    return NextResponse.json({
      success: true,
      data: {
        records: result.records,
        pagination: {
          currentPage: page,
          pageSize: pageSize,
          totalRecords: result.totalRecords,
          totalPages: Math.ceil(result.totalRecords / pageSize)
        },
        stats,
        nextRunTime
      }
    });

  } catch (error: any) {
    console.error('获取执行记录失败:', error);
    return NextResponse.json(
      { success: false, error: '获取执行记录失败: ' + error.message },
      { status: 500 }
    );
  }
}

// 获取指定配置的执行记录（支持分页）
async function getExecutionRecords(configId: string, page = 1, pageSize = 10): Promise<any> {
  try {
    const recordsDir = path.resolve('./data/execution-records');
    const configDir = path.join(recordsDir, `config-${configId}`);
    
    // 确保目录存在
    await fs.ensureDir(configDir);
    
    let allRecords: any[] = [];
    
    // 检查配置目录是否存在
    if (await fs.pathExists(configDir)) {
      // 获取配置目录下的所有JSON文件
      const files = await fs.readdir(configDir);
      const recordFiles = files.filter(file => 
        file.endsWith('.json') && file !== 'stats.json'
      );
      
      // 按文件名排序（最新的在前）
      recordFiles.sort((a, b) => b.localeCompare(a));
      
      // 读取所有记录文件
      for (const file of recordFiles) {
        const filepath = path.join(configDir, file);
        try {
          const records = await fs.readJson(filepath);
          // 确保records是数组
          if (Array.isArray(records)) {
            allRecords = allRecords.concat(records);
          }
        } catch (error: any) {
          console.error(`读取记录文件失败: ${file}`, error);
        }
      }
    }
    
    // 兼容旧的文件结构
    const oldFiles = await fs.readdir(recordsDir);
    const oldConfigFiles = oldFiles.filter(file => 
      file.startsWith(`${configId}-`) && file.endsWith('.json')
    );
    
    for (const file of oldConfigFiles) {
      const filepath = path.join(recordsDir, file);
      try {
        const records = await fs.readJson(filepath);
        if (Array.isArray(records)) {
          allRecords = allRecords.concat(records);
        }
      } catch (error: any) {
        console.error(`读取旧格式记录文件失败: ${file}`, error);
      }
    }
    
    // 按执行时间倒序排列（最新的在前）
    allRecords.sort((a, b) => new Date(b.executedAt || 0).getTime() - new Date(a.executedAt || 0).getTime());
    
    // 计算分页
    const totalRecords = allRecords.length;
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const records = allRecords.slice(startIndex, endIndex);
    
    return {
      records,
      totalRecords,
      currentPage: page,
      pageSize
    };
    
  } catch (error: any) {
    console.error('获取执行记录失败:', error);
    return {
      records: [],
      totalRecords: 0,
      currentPage: page,
      pageSize
    };
  }
}

// 获取配置统计信息
async function getConfigStats(configId: string): Promise<any> {
  try {
    const recordsDir = path.resolve('./data/execution-records');
    const configDir = path.join(recordsDir, `config-${configId}`);
    const statsFile = path.join(configDir, 'stats.json');
    
    if (await fs.pathExists(statsFile)) {
      try {
        return await fs.readJson(statsFile);
      } catch (error: any) {
        console.error('读取统计文件失败:', error);
      }
    }
    
    // 如果没有统计文件，返回默认统计信息
    return {
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
  } catch (error: any) {
    console.error('获取配置统计信息失败:', error);
    return null;
  }
}

// 获取下次执行时间
async function getNextRunTime(configId: string): Promise<string | null> {
  try {
    const jobStatus = schedulerService.getJobStatus(configId);
    if (!jobStatus.exists) {
      return null;
    }
    
    // 从配置服务获取配置信息
    const { default: configService } = await import('../../../lib/configService');
    const config = await configService.getConfigById(parseInt(configId));
    
    if (!config || !config.cronExpression) {
      return null;
    }
    
    // 使用调度器服务计算下次执行时间
    return schedulerService.getNextRunTime(config.cronExpression);
    
  } catch (error: any) {
    console.error('获取下次执行时间失败:', error);
    return null;
  }
}
import { NextResponse } from 'next/server';
import ConfluenceService from '@/lib/confluenceService';

// POST - 获取Confluence页面内容
export async function POST(request) {
  try {
    const body = await request.json();
    const { confluenceUrl, pageType = 'current', username, apiToken, baseUrl } = body;

    // 验证必填字段
    if (!confluenceUrl) {
      return NextResponse.json(
        { success: false, error: '请提供Confluence页面URL' },
        { status: 400 }
      );
    }

    // 创建Confluence服务实例
    const confluenceService = new ConfluenceService();
    
    // 如果提供了认证信息，使用提供的信息
    if (username && apiToken && baseUrl) {
      confluenceService.setConnection(baseUrl, username, apiToken);
    }

    // 根据页面类型获取内容
    const content = await confluenceService.getContentByType(confluenceUrl, pageType);

    return NextResponse.json({
      success: true,
      data: content,
      message: '获取Confluence内容成功'
    });
  } catch (error) {
    console.error('获取Confluence内容失败:', error);
    return NextResponse.json(
      { success: false, error: `获取内容失败: ${error.message}` },
      { status: 500 }
    );
  }
}

// GET - 获取页面内容（通过查询参数）
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const confluenceUrl = searchParams.get('url');
    const pageType = searchParams.get('type') || 'current';

    if (!confluenceUrl) {
      return NextResponse.json(
        { success: false, error: '请提供Confluence页面URL' },
        { status: 400 }
      );
    }

    const confluenceService = new ConfluenceService();
    const content = await confluenceService.getContentByType(confluenceUrl, pageType);

    return NextResponse.json({
      success: true,
      data: content,
      message: '获取Confluence内容成功'
    });
  } catch (error) {
    console.error('获取Confluence内容失败:', error);
    return NextResponse.json(
      { success: false, error: `获取内容失败: ${error.message}` },
      { status: 500 }
    );
  }
}
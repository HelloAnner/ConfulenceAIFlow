import fs from 'fs';
import { NextResponse } from 'next/server';

// GET - 获取所有配置
export async function GET() {
  try {
    // 从文件中读取配置
    const data = fs.readFileSync('./data/configs.json');
    configs = JSON.parse(data);
    return NextResponse.json({ 
      success: true, 
      data: configs 
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: ' Get configs failed ' },
      { status: 500 }
    );
  }
}


export async function POST(request) {
  try {
    const body = await request.json();
    const { title, confluenceUrl, description, notificationType, webhookUrl } = body;

    // 验证必填字段
    if (!title || !confluenceUrl || !description) {
      return NextResponse.json(
        { success: false, error: '请填写所有必填字段' },
        { status: 400 }
      );
    }

    // 创建新配置
    const newConfig = {
      id: Date.now(),
      title,
      confluenceUrl,
      description,
      notificationType: notificationType || 'wechat',
      webhookUrl: webhookUrl || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: 'active'
    };

    // 持久化到文件中
    fs.writeFileSync('./data/configs.json', JSON.stringify(configs, null, 2));

    return NextResponse.json({
      success: true,
      data: newConfig,
      message: '配置创建成功'
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: '创建配置失败' },
      { status: 500 }
    );
  }
}

// PUT - 更新配置
export async function PUT(request) {
  try {
    const body = await request.json();
    const { id, title, confluenceUrl, description, notificationType, webhookUrl } = body;

    // 验证必填字段
    if (!id || !title || !confluenceUrl || !description) {
      return NextResponse.json(
        { success: false, error: '请填写所有必填字段' },
        { status: 400 }
      );
    }

    // 查找并更新配置
    const configIndex = configs.findIndex(config => config.id === id);
    if (configIndex === -1) {
      return NextResponse.json(
        { success: false, error: '配置不存在' },
        { status: 404 }
      );
    }

    configs[configIndex] = {
      ...configs[configIndex],
      title,
      confluenceUrl,
      description,
      notificationType: notificationType || 'wechat',
      webhookUrl: webhookUrl || '',
      updatedAt: new Date().toISOString()
    };

    return NextResponse.json({
      success: true,
      data: configs[configIndex],
      message: '配置更新成功'
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: '更新配置失败' },
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

    // 查找并删除配置
    const configIndex = configs.findIndex(config => config.id === id);
    if (configIndex === -1) {
      return NextResponse.json(
        { success: false, error: '配置不存在' },
        { status: 404 }
      );
    }

    configs.splice(configIndex, 1);

    return NextResponse.json({
      success: true,
      message: '配置删除成功'
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: '删除配置失败' },
      { status: 500 }
    );
  }
}
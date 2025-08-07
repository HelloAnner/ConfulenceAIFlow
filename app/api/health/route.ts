import { NextResponse } from 'next/server';
import { healthCheck } from '../../../lib/startup';

// GET /api/health - 健康检查
export async function GET() {
  try {
    const healthStatus = await healthCheck();
    
    return NextResponse.json(healthStatus, {
      status: healthStatus.success ? 200 : 503
    });
    
  } catch (error: any) {
    console.error('健康检查失败:', error);
    
    return NextResponse.json({
      success: false,
      status: 'error',
      error: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
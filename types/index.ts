// 配置相关类型
export interface Config {
  id: string | number;
  title: string;
  name: string;
  confluenceUrl: string;
  username: string;
  apiToken: string;
  spaceKey: string;
  pageId?: string;
  pageType?: 'current' | 'specific';
  description?: string;
  cronExpression?: string;
  notificationType?: 'wechat' | 'email';
  webhookUrl?: string;
  notificationTemplate?: string;
  userRequirement?: string;
  notificationEmail?: string;
  status: 'active' | 'inactive';
  createdAt: string;
  updatedAt: string;
}

// 执行记录相关类型
export interface ExecutionRecord {
  id: string;
  configId: string | number;
  configName: string;
  status: 'success' | 'error' | 'running';
  startTime: string;
  endTime?: string;
  duration?: number;
  result?: string;
  error?: string;
  createdAt: string;
  analysisResult?: string;
  executionTime?: number;
  executedAt?: string;
  confluenceData?: {
    pageType: string;
    url: string;
    title: string;
    totalPages?: number;
  };
  notificationResult?: {
    success: boolean;
    error?: string;
  };
}

// 分页相关类型
export interface Pagination {
  currentPage: number;
  pageSize: number;
  totalRecords: number;
  totalPages: number;
  itemsPerPage?: number;
}

// 统计相关类型
export interface ExecutionStats {
  totalExecutions: number;
  successCount: number;
  errorCount: number;
  successfulExecutions: number;
  failedExecutions: number;
  averageExecutionTime?: number;
  lastExecution?: string;
  successRate?: number;
}

// API 响应类型
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Confluence 页面类型
export interface ConfluencePage {
  id: string;
  title: string;
  content: string;
  url: string;
  lastModified?: string;
  author?: string;
}

// AI 分析结果类型
export interface AnalysisResult {
  summary?: string;
  keyPoints?: string[];
  actionItems?: ActionItem[];
  risks?: Risk[];
  recommendations?: string[];
  metadata?: {
    analyzedAt: string;
    pageCount: number;
    wordCount: number;
  };
}

export interface ActionItem {
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  category: string;
  estimatedEffort: string;
}

export interface Risk {
  description: string;
  severity: 'high' | 'medium' | 'low';
  mitigation?: string;
}

// 表单数据类型
export interface FormData {
  title: string;
  confluenceUrl: string;
  pageType: 'current' | 'specific';
  description: string;
  notificationType: 'wechat' | 'email';
  webhookUrl: string;
  notificationTemplate: string;
  cronExpression: string;
}

// Cron 模板类型
export interface CronTemplate {
  key: string;
  label: string;
  value: string;
  description: string;
}

// 主题相关类型
export type Theme = 'light' | 'dark' | 'system';

export interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

export interface ThemeProviderProps {
  children: React.ReactNode;
  defaultTheme?: Theme;
  storageKey?: string;
}

// Next.js 相关类型
export { NextRequest, NextResponse } from 'next/server';
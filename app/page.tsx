"use client";

import { Header } from "@/components/header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  BarChart3,
  Brain,
  Calendar,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Edit,
  History,
  Play,
  Plus,
  Search,
  Timer,
  Trash2,
  TrendingDown,
  TrendingUp,
  XCircle
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import type { Config, ExecutionRecord, Pagination, ExecutionStats, FormData, ApiResponse } from "@/types/index";

const ITEMS_PER_PAGE = 5;

export default function Home() {
  const [configs, setConfigs] = useState<Config[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState<boolean>(false);
  const [editingConfig, setEditingConfig] = useState<Config | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [selectedConfig, setSelectedConfig] = useState<Config | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [executionRecords, setExecutionRecords] = useState<ExecutionRecord[]>([]);
  const [nextRunTime, setNextRunTime] = useState<string | null>(null);
  const [loadingRecords, setLoadingRecords] = useState<boolean>(false);
  const [recordsPagination, setRecordsPagination] = useState<Pagination>({
    currentPage: 1,
    pageSize: 10,
    totalRecords: 0,
    totalPages: 0,
    itemsPerPage: ITEMS_PER_PAGE
  });
  const [recordsStats, setRecordsStats] = useState<ExecutionStats | null>(null);
  const [formData, setFormData] = useState<FormData>({
    title: "",
    confluenceUrl: "",
    pageType: "current" as const,
    description: "",
    notificationType: "wechat",
    webhookUrl: "",
    notificationTemplate: "📋 AI分析报告\n\n{{content}}",
    cronExpression: "0 9 * * 1-5"
  });

  // 从后台加载配置
  useEffect(() => {
    const fetchConfigs = async () => {
      try {
        const response = await fetch('/api/configs');
        const result = await response.json();
        if (result.success) {
          setConfigs(result.data || []);
        } else {
          console.error('获取配置失败:', result.error);
          toast.error('获取配置失败');
        }
      } catch (error: any) {
        console.error('获取配置失败:', error);
        toast.error('获取配置失败');
      }
    };

    fetchConfigs();
  }, []);

  // 保存单个配置
  const saveConfig = async (config: Config, isEdit: boolean = false): Promise<Config> => {
    try {
      const method = isEdit ? 'PUT' : 'POST';
      const response = await fetch('/api/configs', {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(config)
      });

      const result = await response.json();
      if (result.success) {
        // 重新获取配置列表
        const configsResponse = await fetch('/api/configs');
        const configsResult = await configsResponse.json();
        if (configsResult.success) {
          setConfigs(configsResult.data || []);
        }
        return result.data;
      } else {
        throw new Error(result.error);
      }
    } catch (error: any) {
      console.error('保存配置失败:', error);
      toast.error('保存配置失败: ' + error.message);
      throw error;
    }
  };

  // 删除配置
  const deleteConfig = async (id: string): Promise<any> => {
    try {
      const response = await fetch(`/api/configs?id=${id}`, {
        method: 'DELETE'
      });

      const result = await response.json();
      if (result.success) {
        // 重新获取配置列表
        const configsResponse = await fetch('/api/configs');
        const configsResult = await configsResponse.json();
        if (configsResult.success) {
          setConfigs(configsResult.data || []);
        }
        return result.data;
      } else {
        throw new Error(result.error);
      }
    } catch (error: any) {
      console.error('删除配置失败:', error);
      toast.error('删除配置失败: ' + error.message);
      throw error;
    }
  };

  // 重置表单
  const resetForm = () => {
    setFormData({
      title: "",
      confluenceUrl: "",
      pageType: "current",
      description: "",
      notificationType: "wechat",
      webhookUrl: "",
      notificationTemplate: "📋 AI分析报告\n\n{{content}}",
      cronExpression: "0 9 * * 1-5"
    });
    setEditingConfig(null);
  };

  // 计算下次执行时间的函数
  const getNextRunTime = (cronExpression: string): string => {
    if (!cronExpression) return '';

    try {
      // 简单的 cron 解析实现
      const parts = cronExpression.trim().split(/\s+/);
      if (parts.length !== 5) {
        return '无效的 cron 表达式';
      }

      const [minute, hour, dayOfMonth, month, dayOfWeek] = parts;
      const now = new Date();
      const nextRun = new Date(now);

      // 处理分钟
      if (minute !== '*') {
        const targetMinute = parseInt(minute);
        if (!isNaN(targetMinute) && targetMinute >= 0 && targetMinute <= 59) {
          nextRun.setMinutes(targetMinute);
          nextRun.setSeconds(0);
          nextRun.setMilliseconds(0);

          if (nextRun <= now) {
            nextRun.setHours(nextRun.getHours() + 1);
          }
        }
      }

      // 处理小时
      if (hour !== '*') {
        const targetHour = parseInt(hour);
        if (!isNaN(targetHour) && targetHour >= 0 && targetHour <= 23) {
          nextRun.setHours(targetHour);

          if (nextRun <= now) {
            nextRun.setDate(nextRun.getDate() + 1);
          }
        }
      }

      // 确保下次执行时间在未来
      if (nextRun <= now) {
        if (minute !== '*') {
          nextRun.setHours(nextRun.getHours() + 1);
        } else {
          nextRun.setMinutes(nextRun.getMinutes() + 1);
        }
      }

      return nextRun.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error: any) {
      return '计算失败';
    }
  };

  // 处理表单提交
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    if (!formData.title || !formData.confluenceUrl || !formData.description) {
      toast.error("请填写所有必填字段");
      setIsLoading(false);
      return;
    }

    try {
      const configData = {
        ...formData,
        ...(editingConfig && { id: editingConfig.id })
      };

      const savedConfig = await saveConfig(configData as Config, !!editingConfig);

      if (editingConfig) {
        toast.success("配置更新成功！");
      } else {
        toast.success("配置创建成功！");
      }

      setSelectedConfig(savedConfig);
      setIsDialogOpen(false);
      resetForm();
    } catch (error: any) {
      // 错误已在saveConfig中处理
    } finally {
      setIsLoading(false);
    }
  };

  // 删除配置
  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除这个配置吗？')) {
      return;
    }

    try {
      await deleteConfig(id);
      if (selectedConfig && selectedConfig.id === id) {
        setSelectedConfig(null);
      }
      toast.success("配置删除成功！");
    } catch (error: any) {
      // 错误已在deleteConfig中处理
    }
  };

  // 编辑配置
  const handleEdit = (config: Config) => {
    setFormData({
      title: config.title,
      confluenceUrl: config.confluenceUrl,
      pageType: config.pageType || "current",
      description: config.description || "",
      notificationType: config.notificationType || "wechat",
      webhookUrl: config.webhookUrl || "",
      notificationTemplate: config.notificationTemplate || "📋 AI分析报告\n\n{{content}}",
      cronExpression: config.cronExpression || "0 9 * * 1-5"
    });
    setEditingConfig(config);
    setIsDialogOpen(true);
  };

  // 分页逻辑
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [expandedConfig, setExpandedConfig] = useState<string | null>(null);

  // 切换展开状态
  const toggleExpanded = (id: string) => {
    setExpandedConfig(expandedConfig === id ? null : id);
  };

  // 立即触发执行
  const handleTriggerNow = async (config: Config) => {
    if (!config) return;

    try {
      setIsLoading(true);
      const response = await fetch('/api/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ configId: config.id })
      });

      const result = await response.json();
      if (result.success) {
        toast.success('任务已触发执行！');
        // 重新获取执行记录
        if (selectedConfig && selectedConfig.id === config.id) {
          fetchExecutionRecords(String(config.id));
        }
      } else {
        throw new Error(result.error);
      }
    } catch (error: any) {
      console.error('触发执行失败:', error);
      toast.error('触发执行失败: ' + (error as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  // 获取执行记录
  const fetchExecutionRecords = async (configId: string, page = 1, pageSize = 10) => {
    if (!configId) return;

    try {
      setLoadingRecords(true);
      const response = await fetch(`/api/execution-records?configId=${configId}&page=${page}&pageSize=${pageSize}`);
      const result = await response.json();

      if (result.success) {
        setExecutionRecords(result.data.records || []);
        setNextRunTime(result.data.nextRunTime);
        setRecordsPagination(result.data.pagination || {
          currentPage: 1,
          pageSize: 10,
          totalRecords: 0,
          totalPages: 0
        });
        setRecordsStats(result.data.stats);
      } else {
        console.error('获取执行记录失败:', result.error);
        setExecutionRecords([]);
        setNextRunTime(null);
        setRecordsPagination({
          currentPage: 1,
          pageSize: 10,
          totalRecords: 0,
          totalPages: 0
        });
        setRecordsStats(null);
      }
    } catch (error: any) {
      console.error('获取执行记录失败:', error);
      setExecutionRecords([]);
      setNextRunTime(null);
      setRecordsPagination({
        currentPage: 1,
        pageSize: 10,
        totalRecords: 0,
        totalPages: 0
      });
      setRecordsStats(null);
    } finally {
      setLoadingRecords(false);
    }
  };

  // 分页处理函数
  const handlePageChange = (newPage: number) => {
    if (selectedConfig && newPage >= 1 && newPage <= recordsPagination.totalPages) {
      fetchExecutionRecords(selectedConfig.id as string, newPage, recordsPagination.pageSize as number);
    }
  };

  // 当选择配置时获取执行记录
  useEffect(() => {
    if (selectedConfig) {
      fetchExecutionRecords(selectedConfig.id as string, 1, 10);
    } else {
      setExecutionRecords([]);
      setNextRunTime(null);
      setRecordsPagination({
        currentPage: 1,
        pageSize: 10,
        totalRecords: 0,
        totalPages: 0
      });
      setRecordsStats(null);
    }
  }, [selectedConfig]);

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <div className="flex justify-center px-4 py-6">
        <div className="w-full max-w-6xl flex bg-white rounded-lg shadow-sm border border-gray-200 h-[calc(100vh-140px)]">
          {/* 左侧配置列表 */}
          <div className="w-80 border-r border-gray-200 flex flex-col">
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">配置列表</h2>
              </div>
              {/* 搜索框 */}
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input 
                  type="text"
                  placeholder="搜索配置..."
                  value={searchTerm}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              {/* 新建按钮 */}
              <div className="mb-4">
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                  <DialogTrigger asChild>
                    <Button 
                      variant="default"
                      size="sm"
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                      onClick={resetForm}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      新建配置
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-4xl max-h-[80vh] bg-white overflow-y-auto">
                    <DialogHeader className="bg-gray-50 p-4 border-b border-gray-200">
                      <DialogTitle className="text-lg font-semibold text-gray-900">
                        {editingConfig ? '编辑配置' : '新建配置'}
                      </DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4">
                      <div className="space-y-2">
                        <Label className="text-gray-700" htmlFor="title">配置名称</Label>
                        <Input 
                          type="text"
                          id="title"
                          value={formData.title}
                          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                          placeholder="请输入配置名称"
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label className="text-gray-700" htmlFor="confluenceUrl">Confluence 页面地址</Label>
                        <Input 
                          type="text"
                          id="confluenceUrl"
                          value={formData.confluenceUrl}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, confluenceUrl: e.target.value })}
                          placeholder="https://your-domain.atlassian.net/wiki/..."
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label className="text-gray-700" htmlFor="pageType">页面类型</Label>
                        <Select value={formData.pageType} onValueChange={(value: "current" | "specific") => setFormData({ ...formData, pageType: value })}>
                          <SelectTrigger className="w-full">
                            <SelectValue className="text-gray-700" />
                          </SelectTrigger>
                          <SelectContent className="bg-white">
                            <SelectItem className="text-gray-700" value="current">当前页面内容</SelectItem>
                            <SelectItem className="text-gray-700" value="all-children">当前页面的全部子页面内容</SelectItem>
                            <SelectItem className="text-gray-700" value="latest-children">当前页面的最新子页面内容</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-gray-700" htmlFor="description">AI 处理需求</Label>
                        <Textarea
                          id="description"
                          value={formData.description}
                          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFormData({ ...formData, description: e.target.value })}
                          placeholder="描述您希望 AI 如何处理这些内容..."
                          className="min-h-32"
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label className="text-gray-700" htmlFor="notificationType">通知方式</Label>
                        <Select value={formData.notificationType} onValueChange={(value: "wechat" | "email") => setFormData({ ...formData, notificationType: value })}>
                          <SelectTrigger className="w-full">
                            <SelectValue className="text-gray-700" />
                          </SelectTrigger>
                          <SelectContent className="bg-white">
                            <SelectItem className="text-gray-700" value="wechat">企业微信</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-gray-700" htmlFor="webhookUrl">Webhook URL</Label>
                        <Input 
                          type="text"
                          id="webhookUrl"
                          value={formData.webhookUrl}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, webhookUrl: e.target.value })}
                          placeholder="请输入企业微信 Webhook URL"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label className="text-gray-700" htmlFor="notificationTemplate">通知模板</Label>
                        <Textarea
                          id="notificationTemplate"
                          value={formData.notificationTemplate}
                          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFormData({ ...formData, notificationTemplate: e.target.value })}
                          placeholder="📋 AI分析报告\n\n{{content}}"
                          className="min-h-24"
                        />
                        <p className="text-xs text-gray-500">
                          使用  content  作为 AI 返回内容的占位符
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-gray-700" htmlFor="cronExpression">执行周期 (Cron)</Label>
                        <Input 
                          type="text"
                          id="cronExpression"
                          value={formData.cronExpression}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, cronExpression: e.target.value })}
                          placeholder="0 9 * * 1-5"
                        />
                        {formData.cronExpression && (
                          <p className="text-sm text-gray-600">
                            下次执行时间: {getNextRunTime(formData.cronExpression)}
                          </p>
                        )}
                      </div>

                      <div className="flex justify-end space-x-2 pt-4">
                        <Button 
                          type="button"
                          variant="outline"
                          onClick={() => setIsDialogOpen(false)}
                        >
                          取消
                        </Button>
                        <Button 
                          type="submit"
                          className="bg-blue-600 text-white hover:bg-blue-700"
                        >
                          {editingConfig ? '更新' : '创建'}
                        </Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
              <p className="text-sm text-gray-500">共 {configs.filter(config =>
                config.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                config.description?.toLowerCase().includes(searchTerm.toLowerCase())
              ).length} 个配置</p>
            </div>

            <div className="flex-1 overflow-y-auto">
              {configs.filter(config =>
                config.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                config.description?.toLowerCase().includes(searchTerm.toLowerCase())
              ).length === 0 ? (
                <div className="p-6 text-center">
                  <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                    <Brain className="w-6 h-6 text-gray-400" />
                  </div>
                  <p className="text-sm text-gray-500 mb-2">{searchTerm ? '未找到匹配的配置' : '暂无配置'}</p>
                  <p className="text-xs text-gray-400">{searchTerm ? '尝试修改搜索关键词' : '点击新建按钮创建配置'}</p>
                </div>
              ) : (
                <div className="space-y-1 p-2">
                  {configs.filter(config =>
                    config.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    config.description?.toLowerCase().includes(searchTerm.toLowerCase())
                  ).map((config) => (
                    <div
                      key={config.id}
                      onClick={() => setSelectedConfig(config)}
                      className={`p-4 rounded-lg cursor-pointer transition-colors ${selectedConfig?.id === config.id
                        ? 'bg-blue-50 border border-blue-200'
                        : 'hover:bg-gray-50'
                        }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm font-medium text-gray-900 truncate">
                            {config.title}
                          </h3>
                          <p className="text-xs text-gray-500 mt-1">
                            {new Date(config.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex items-center space-x-1 ml-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEdit(config);
                            }}
                            className="h-8 w-8 p-0"
                          >
                            <Edit className="w-3 h-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(String(config.id));
                            }}
                            className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* 右侧详情区域 */}
          <div className="flex-1 pl-4">
            {selectedConfig ? (
              <div className="h-full overflow-y-auto">
                <div className="p-3">
                  <div className="max-w-4xl">
                    {/* 配置标题 */}
                    <div className="mb-3 flex items-start justify-between">
                      <div>
                        <h1 className="text-lg font-bold text-gray-900 mb-1">
                          {selectedConfig.title}
                        </h1>
                        <p className="text-gray-500 text-xs">
                          创建于 {new Date(selectedConfig.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <Button
                        onClick={() => handleTriggerNow(selectedConfig)}
                        disabled={isLoading}
                        size="sm"
                        className="bg-green-600 hover:bg-green-700 text-white"
                      >
                        <Play className="w-3 h-3 mr-1" />
                        {isLoading ? '执行中...' : '立即触发'}
                      </Button>
                    </div>

                    {/* 下次执行时间 */}
                    {nextRunTime && (
                      <Card className="mb-3">
                        <CardContent className="p-3">
                          <div className="flex items-center space-x-2">
                            <Calendar className="w-4 h-4 text-blue-600" />
                            <span className="text-sm font-medium text-gray-700">下次执行时间:</span>
                            <span className="text-sm text-gray-900">{nextRunTime}</span>
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {/* 执行历史 */}
                    <Card>
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <History className="w-4 h-4 text-purple-600" />
                            <h3 className="text-base font-semibold">执行历史</h3>
                            {loadingRecords && (
                              <div className="ml-2">
                                <div className="w-4 h-4 border-2 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
                              </div>
                            )}
                          </div>
                          {recordsStats && (
                            <div className="flex items-center space-x-4 text-xs text-gray-500">
                              <div className="flex items-center space-x-1">
                                <BarChart3 className="w-3 h-3" />
                                <span>总计: {recordsStats.totalExecutions}</span>
                              </div>
                              <div className="flex items-center space-x-1">
                                <TrendingUp className="w-3 h-3 text-green-600" />
                                <span className="text-green-600">{recordsStats.successfulExecutions}</span>
                              </div>
                              <div className="flex items-center space-x-1">
                                <TrendingDown className="w-3 h-3 text-red-600" />
                                <span className="text-red-600">{recordsStats.failedExecutions}</span>
                              </div>
                            </div>
                          )}
                        </div>
                        {recordsStats && recordsStats.totalExecutions > 0 && (
                          <div className="mt-2 grid grid-cols-3 gap-4 text-xs">
                            <div className="bg-blue-50 p-2 rounded">
                              <span className="font-medium text-blue-700">成功率:</span>
                              <p className="text-blue-600">
                                {((recordsStats.successfulExecutions / recordsStats.totalExecutions) * 100).toFixed(1)}%
                              </p>
                            </div>
                            <div className="bg-green-50 p-2 rounded">
                              <span className="font-medium text-green-700">平均耗时:</span>
                              <p className="text-green-600">{recordsStats.averageExecutionTime}ms</p>
                            </div>
                            <div className="bg-purple-50 p-2 rounded">
                              <span className="font-medium text-purple-700">最后执行:</span>
                              <p className="text-purple-600">
                                {recordsStats.lastExecution ? new Date(recordsStats.lastExecution).toLocaleDateString('zh-CN') : '无'}
                              </p>
                            </div>
                          </div>
                        )}
                      </CardHeader>
                      <CardContent className="pt-0">
                        {executionRecords.length === 0 ? (
                          <div className="text-center py-8">
                            <History className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                            <p className="text-gray-500 text-sm">暂无执行记录</p>
                            <p className="text-gray-400 text-xs mt-1">执行任务后将显示历史记录</p>
                          </div>
                        ) : (
                            <>
                              <div className="space-y-3">
                                {executionRecords.map((record, index) => (
                                  <div key={index} className="border border-gray-200 rounded-lg p-3 hover:bg-gray-50 transition-colors">
                                    <div className="flex items-start justify-between mb-2">
                                      <div className="flex items-center space-x-2">
                                        {record.status === 'success' ? (
                                          <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
                                        ) : (
                                          <XCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
                                        )}
                                        <span className={`text-xs font-medium ${record.status === 'success' ? 'text-green-700' : 'text-red-700'
                                          }`}>
                                          {record.status === 'success' ? '执行成功' : '执行失败'}
                                        </span>
                                      </div>
                                      <div className="flex items-center space-x-3 text-xs text-gray-500">
                                        <div className="flex items-center space-x-1">
                                          <Timer className="w-3 h-3" />
                                          <span>{record.executionTime}</span>
                                        </div>
                                        <span>{record.executedAt ? new Date(record.executedAt).toLocaleString('zh-CN') : '未知时间'}</span>
                                      </div>
                                    </div>

                                    {record.status === 'error' && record.error && (
                                      <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs">
                                        <span className="font-medium text-red-700">错误信息:</span>
                                        <p className="text-red-600 mt-1">{record.error}</p>
                                      </div>
                                    )}

                                    {record.status === 'success' && record.confluenceData && (
                                      <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                                        <div className="bg-blue-50 p-2 rounded">
                                          <span className="font-medium text-blue-700">页面类型:</span>
                                          <p className="text-blue-600">{record.confluenceData.pageType}</p>
                                        </div>
                                        <div className="bg-blue-50 p-2 rounded">
                                          <span className="font-medium text-blue-700">页面数量:</span>
                                          <p className="text-blue-600">{record.confluenceData.totalPages || 1}</p>
                                        </div>
                                      </div>
                                    )}

                                    {record.status === 'success' && record.analysisResult && (
                                      <div className="mt-2 p-2 bg-purple-50 border border-purple-200 rounded">
                                        <span className="font-medium text-purple-700 text-xs">AI 分析结果:</span>
                                        <p className="text-purple-600 text-xs mt-1 line-clamp-3">
                                          {record.analysisResult.length > 200
                                            ? record.analysisResult.substring(0, 200) + '...'
                                            : record.analysisResult
                                          }
                                        </p>
                                      </div>
                                    )}

                                    {record.status === 'success' && record.notificationResult && (
                                      <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded">
                                        <span className="font-medium text-green-700 text-xs">通知状态:</span>
                                        <p className="text-green-600 text-xs mt-1">
                                          {record.notificationResult.success ? '通知发送成功' : `通知发送失败: ${record.notificationResult.error}`}
                                        </p>
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>

                              {/* 分页控件 */}
                              {recordsPagination.totalPages > 1 && (
                                <div className="mt-4 flex items-center justify-between border-t border-gray-200 pt-4">
                                  <div className="text-xs text-gray-500">
                                    显示第 {((recordsPagination.currentPage - 1) * recordsPagination.pageSize) + 1} - {Math.min(recordsPagination.currentPage * recordsPagination.pageSize, recordsPagination.totalRecords)} 条，
                                    共 {recordsPagination.totalRecords} 条记录
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handlePageChange(recordsPagination.currentPage - 1)}
                                      disabled={recordsPagination.currentPage <= 1 || loadingRecords}
                                      className="h-8 w-8 p-0"
                                    >
                                      <ChevronLeft className="w-4 h-4" />
                                    </Button>

                                    <div className="flex items-center space-x-1">
                                      {Array.from({ length: Math.min(5, recordsPagination.totalPages) }, (_, i) => {
                                        let pageNum: number;
                                        if (recordsPagination.totalPages <= 5) {
                                          pageNum = i + 1;
                                        } else if (recordsPagination.currentPage <= 3) {
                                          pageNum = i + 1;
                                        } else if (recordsPagination.currentPage >= recordsPagination.totalPages - 2) {
                                          pageNum = recordsPagination.totalPages - 4 + i;
                                        } else {
                                          pageNum = recordsPagination.currentPage - 2 + i;
                                        }

                                        return (
                                          <Button
                                            key={pageNum}
                                            variant={pageNum === recordsPagination.currentPage ? "default" : "outline"}
                                            size="sm"
                                            onClick={() => handlePageChange(pageNum)}
                                            disabled={loadingRecords}
                                            className="h-8 w-8 p-0 text-xs"
                                          >
                                            {pageNum}
                                          </Button>
                                        );
                                      })}
                                    </div>

                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handlePageChange(recordsPagination.currentPage + 1)}
                                      disabled={recordsPagination.currentPage >= recordsPagination.totalPages || loadingRecords}
                                      className="h-8 w-8 p-0"
                                    >
                                      <ChevronRight className="w-4 h-4" />
                                    </Button>
                                  </div>
                                </div>
                              )}
                            </>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center">
                <div className="text-center">
                  <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                    <Brain className="w-8 h-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">选择配置查看执行历史</h3>
                  <p className="text-gray-500">从左侧列表中选择一个配置来查看执行记录</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

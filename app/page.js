"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Bot,
  Brain,
  Edit,
  FileText,
  Plus,
  Settings,
  Trash2,
  Workflow,
  Zap,
  Clock,
  Globe,
  Bell,
  ChevronUp,
  ChevronDown
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Header } from "@/components/header";

const ITEMS_PER_PAGE = 5;

export default function Home() {
  const [configs, setConfigs] = useState([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingConfig, setEditingConfig] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedConfig, setSelectedConfig] = useState(null);
  const [formData, setFormData] = useState({
    title: "",
    confluenceUrl: "",
    pageType: "current",
    description: "",
    notificationType: "wechat",
    webhookUrl: "",
    cronExpression: "0 9 * * 1-5"
  });

  const menuItems = [
    { icon: Workflow, label: 'AI 工作流', active: true },
    { icon: Bot, label: '智能助手' },
    { icon: Brain, label: '知识库' },
    { icon: Settings, label: '系统设置' },
    { icon: FileText, label: '文档管理' }
  ];

  // 从localStorage加载配置
  useEffect(() => {
    const savedConfigs = localStorage.getItem('confluenceConfigs');
    if (savedConfigs) {
      setConfigs(JSON.parse(savedConfigs));
    }
  }, []);

  // 保存配置到localStorage
  const saveConfigs = (newConfigs) => {
    localStorage.setItem('confluenceConfigs', JSON.stringify(newConfigs));
    setConfigs(newConfigs);
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
      cronExpression: "0 9 * * 1-5"
    });
    setEditingConfig(null);
  };

  // 计算下次执行时间
  const getNextRunTime = (cronExpression) => {
    // 简单的 cron 解析示例，实际项目中应使用专业的 cron 库
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(9, 0, 0, 0);
    return tomorrow.toLocaleString('zh-CN');
  };

  // 处理表单提交
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    
    if (!formData.title || !formData.confluenceUrl || !formData.description) {
      toast.error("请填写所有必填字段");
      setIsLoading(false);
      return;
    }

    const newConfig = {
      id: editingConfig ? editingConfig.id : Date.now(),
      ...formData,
      createdAt: editingConfig ? editingConfig.createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      nextRunTime: getNextRunTime(formData.cronExpression)
    };

    let newConfigs;
    if (editingConfig) {
      newConfigs = configs.map(config => 
        config.id === editingConfig.id ? newConfig : config
      );
      toast.success("配置更新成功！");
    } else {
      newConfigs = [...configs, newConfig];
      toast.success("配置创建成功！");
    }

    saveConfigs(newConfigs);
    setSelectedConfig(newConfig);
    setIsDialogOpen(false);
    resetForm();
    setIsLoading(false);
  };

  // 删除配置
  const handleDelete = (id) => {
    if (!confirm('确定要删除这个配置吗？')) {
      return;
    }
    const newConfigs = configs.filter(config => config.id !== id);
    saveConfigs(newConfigs);
    if (selectedConfig && selectedConfig.id === id) {
      setSelectedConfig(null);
    }
    toast.success("配置删除成功！");
  };

  // 编辑配置
  const handleEdit = (config) => {
    setFormData({
      title: config.title,
      confluenceUrl: config.confluenceUrl,
      pageType: config.pageType || "current",
      description: config.description,
      notificationType: config.notificationType,
      webhookUrl: config.webhookUrl || "",
      cronExpression: config.cronExpression || "0 9 * * 1-5"
    });
    setEditingConfig(config);
    setIsDialogOpen(true);
  };

  // 分页逻辑
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedConfig, setExpandedConfig] = useState(null);
  
  // 切换展开状态
  const toggleExpanded = (id) => {
    setExpandedConfig(expandedConfig === id ? null : id);
  };

  const totalPages = Math.ceil(configs.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const currentConfigs = configs.slice(startIndex, endIndex);

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="flex h-[calc(100vh-80px)]">
        {/* 左侧配置列表 */}
        <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">配置列表</h2>
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button 
                    size="sm" 
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                    onClick={resetForm}
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    新建
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-2xl bg-white">
                   <DialogHeader>
                     <DialogTitle>
                       {editingConfig ? '编辑配置' : '新建配置'}
                     </DialogTitle>
                   </DialogHeader>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="title">配置名称</Label>
                      <Input
                        id="title"
                        value={formData.title}
                        onChange={(e) => setFormData({...formData, title: e.target.value})}
                        placeholder="请输入配置名称"
                        required
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="confluenceUrl">Confluence 页面地址</Label>
                      <Input
                        id="confluenceUrl"
                        value={formData.confluenceUrl}
                        onChange={(e) => setFormData({...formData, confluenceUrl: e.target.value})}
                        placeholder="https://your-domain.atlassian.net/wiki/..."
                        required
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="pageType">页面类型</Label>
                      <Select value={formData.pageType} onValueChange={(value) => setFormData({...formData, pageType: value})}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-white">
                           <SelectItem value="current">当前页面内容</SelectItem>
                           <SelectItem value="all-children">当前页面的全部子页面内容</SelectItem>
                           <SelectItem value="latest-children">当前页面的最新子页面内容</SelectItem>
                         </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                       <Label htmlFor="description">AI 处理需求</Label>
                       <Textarea
                         id="description"
                         value={formData.description}
                         onChange={(e) => setFormData({...formData, description: e.target.value})}
                         placeholder="描述您希望 AI 如何处理这些内容..."
                         className="min-h-32"
                         required
                       />
                     </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="notificationType">通知方式</Label>
                      <Select value={formData.notificationType} onValueChange={(value) => setFormData({...formData, notificationType: value})}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-white">
                           <SelectItem value="wechat">企业微信</SelectItem>
                         </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="webhookUrl">Webhook URL</Label>
                      <Input
                        id="webhookUrl"
                        value={formData.webhookUrl}
                        onChange={(e) => setFormData({...formData, webhookUrl: e.target.value})}
                        placeholder="请输入企业微信 Webhook URL"
                      />
                    </div>
                    
                    <div className="space-y-2">
                       <Label htmlFor="cronExpression">执行周期 (Cron)</Label>
                       <Input
                         id="cronExpression"
                         value={formData.cronExpression}
                         onChange={(e) => setFormData({...formData, cronExpression: e.target.value})}
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
                      <Button type="submit">
                        {editingConfig ? '更新' : '创建'}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
            <p className="text-sm text-gray-500">共 {configs.length} 个配置</p>
          </div>
          
          <div className="flex-1 overflow-y-auto">
            {configs.length === 0 ? (
              <div className="p-6 text-center">
                <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                  <Brain className="w-6 h-6 text-gray-400" />
                </div>
                <p className="text-sm text-gray-500 mb-2">暂无配置</p>
                <p className="text-xs text-gray-400">点击新建按钮创建配置</p>
              </div>
            ) : (
              <div className="space-y-1 p-2">
                {configs.map((config) => (
                  <div
                    key={config.id}
                    onClick={() => setSelectedConfig(config)}
                    className={`p-4 rounded-lg cursor-pointer transition-colors ${
                      selectedConfig?.id === config.id
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
                            handleDelete(config.id);
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
        <div className="flex-1 bg-white">
          {selectedConfig ? (
            <div className="h-full overflow-y-auto">
              <div className="p-8">
                <div className="max-w-4xl">
                  {/* 配置标题 */}
                  <div className="mb-8">
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">
                      {selectedConfig.title}
                    </h1>
                    <p className="text-gray-500">
                      创建于 {new Date(selectedConfig.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  
                  {/* 配置详情 */}
                  <div className="space-y-8">
                    <Card>
                      <CardHeader>
                        <div className="flex items-center space-x-2">
                          <Globe className="w-5 h-5 text-blue-600" />
                          <h3 className="text-lg font-semibold">页面配置</h3>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div>
                          <Label className="text-sm font-medium text-gray-700">Confluence 页面地址</Label>
                          <p className="mt-1 text-gray-900 bg-gray-50 p-3 rounded-lg break-all">
                            {selectedConfig.confluenceUrl}
                          </p>
                        </div>
                        <div>
                          <Label className="text-sm font-medium text-gray-700">页面类型</Label>
                          <p className="mt-1 text-gray-900">
                            {selectedConfig.pageType === 'current' ? '当前页面内容' :
                             selectedConfig.pageType === 'all-children' ? '当前页面的全部子页面内容' :
                             '当前页面的最新子页面内容'}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardHeader>
                        <div className="flex items-center space-x-2">
                          <Brain className="w-5 h-5 text-purple-600" />
                          <h3 className="text-lg font-semibold">AI 处理配置</h3>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div>
                          <Label className="text-sm font-medium text-gray-700">处理需求</Label>
                          <p className="mt-1 text-gray-900 bg-gray-50 p-3 rounded-lg leading-relaxed">
                            {selectedConfig.description}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardHeader>
                        <div className="flex items-center space-x-2">
                          <Bell className="w-5 h-5 text-green-600" />
                          <h3 className="text-lg font-semibold">通知配置</h3>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div>
                          <Label className="text-sm font-medium text-gray-700">通知方式</Label>
                          <p className="mt-1 text-gray-900">企业微信</p>
                        </div>
                        {selectedConfig.webhookUrl && (
                          <div>
                            <Label className="text-sm font-medium text-gray-700">Webhook URL</Label>
                            <p className="mt-1 text-gray-900 bg-gray-50 p-3 rounded-lg break-all font-mono text-sm">
                              {selectedConfig.webhookUrl}
                            </p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardHeader>
                        <div className="flex items-center space-x-2">
                          <Clock className="w-5 h-5 text-orange-600" />
                          <h3 className="text-lg font-semibold">执行计划</h3>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div>
                          <Label className="text-sm font-medium text-gray-700">执行周期</Label>
                          <p className="mt-1 text-gray-900 font-mono">
                            {selectedConfig.cronExpression || '0 9 * * 1-5'}
                          </p>
                        </div>
                        <div>
                          <Label className="text-sm font-medium text-gray-700">下次执行时间</Label>
                          <p className="mt-1 text-gray-900">
                            {selectedConfig.nextRunTime || getNextRunTime(selectedConfig.cronExpression || '0 9 * * 1-5')}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <Brain className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">选择配置查看详情</h3>
                <p className="text-gray-500">从左侧列表中选择一个配置来查看详细信息</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

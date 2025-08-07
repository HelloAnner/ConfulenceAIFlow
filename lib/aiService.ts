import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { ChatOpenAI } from '@langchain/openai';
import type { AnalysisResult, ActionItem, Risk } from '@/types';

class AIService {
  private llm: ChatOpenAI;

  constructor() {
    this.llm = new ChatOpenAI({
      openAIApiKey: process.env.OPENAI_API_KEY,
      modelName: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
      temperature: 0.7,
      maxTokens: 2000,
      configuration: {
        baseURL: process.env.OPENAI_BASE_URL
      }
    });
  }

  // 创建系统提示模板
  createSystemPrompt(): string {
    return `你是一个专业的文档分析助手，专门分析 Confluence 页面内容。请根据用户的具体需求，对提供的文档内容进行分析，并只用一句话简洁地总结分析结果。`;
  }

  // 创建用户提示模板
  createUserPrompt(confluenceContent: string, userRequirement: string): string {
    return `请分析以下 Confluence 文档内容，并根据我的具体需求进行分析：

**我的分析需求：**
${userRequirement}

**文档内容：**
${confluenceContent}

请根据上述需求，对文档内容进行分析，并只用一句话简洁地总结分析结果，不要返回JSON格式，只返回纯文本的一句话总结。`;
  }

  // 分析 Confluence 内容
  async analyzeContent(confluenceContent: string, userRequirement: string): Promise<string> {
    try {
      const systemMessage = new SystemMessage(this.createSystemPrompt());
      const userMessage = new HumanMessage(
        this.createUserPrompt(confluenceContent, userRequirement)
      );

      console.log('开始AI分析...');
      const response = await this.llm.invoke([systemMessage, userMessage]);
      console.log('AI分析完成', response);
      return typeof response.content === 'string' ? response.content : String(response.content);
    } catch (error: any) {
      console.error('AI分析失败:', error);
      throw new Error(`AI分析失败: ${error.message}`);
    }
  }

  // 备用解析方法：提取摘要
  extractSummary(content: string): string {
    const lines = content.split('\n');
    for (const line of lines) {
      if (line.includes('摘要') || line.includes('总结') || line.includes('Summary')) {
        return line.replace(/^[^:：]*[:：]\s*/, '').trim();
      }
    }
    return content.substring(0, 200) + '...';
  }

  // 备用解析方法：提取关键点
  extractKeyPoints(content: string): string[] {
    const points: string[] = [];
    const lines = content.split('\n');
    
    for (const line of lines) {
      if (line.match(/^[\s]*[-*•]/) || line.match(/^\d+\./)) {
        const point = line.replace(/^[\s]*[-*•\d.]+\s*/, '').trim();
        if (point.length > 10) {
          points.push(point);
        }
      }
    }
    
    return points.slice(0, 5); // 最多返回5个关键点
  }

  // 备用解析方法：提取行动项
  extractActionItems(content: string): ActionItem[] {
    const actionItems: ActionItem[] = [];
    const lines = content.split('\n');
    
    for (const line of lines) {
      if (line.includes('行动') || line.includes('待办') || line.includes('任务') || line.includes('Action')) {
        actionItems.push({
          title: line.trim(),
          description: '',
          priority: 'medium',
          category: '一般',
          estimatedEffort: '待评估'
        });
      }
    }
    
    return actionItems.slice(0, 3); // 最多返回3个行动项
  }

  // 备用解析方法：提取建议
  extractRecommendations(content: string): string[] {
    const recommendations: string[] = [];
    const lines = content.split('\n');
    
    for (const line of lines) {
      if (line.includes('建议') || line.includes('推荐') || line.includes('Recommend')) {
        const rec = line.replace(/^[^:：]*[:：]\s*/, '').trim();
        if (rec.length > 10) {
          recommendations.push(rec);
        }
      }
    }
    
    return recommendations.slice(0, 3); // 最多返回3个建议
  }

  // 格式化分析结果用于通知
  formatResultForNotification(analysisResult: AnalysisResult): string {
    let message = `# AI 分析结果\n\n`;
    
    if (analysisResult.summary) {
      message += `## 📋 内容摘要\n${analysisResult.summary}\n\n`;
    }
    
    if (analysisResult.keyPoints && analysisResult.keyPoints.length > 0) {
      message += `## 🔍 关键信息\n`;
      analysisResult.keyPoints.forEach((point, index) => {
        message += `${index + 1}. ${point}\n`;
      });
      message += '\n';
    }
    
    if (analysisResult.actionItems && analysisResult.actionItems.length > 0) {
      message += `## ✅ 行动项\n`;
      analysisResult.actionItems.forEach((item, index) => {
        const priorityEmoji = item.priority === 'high' ? '🔴' : item.priority === 'medium' ? '🟡' : '🟢';
        message += `${index + 1}. ${priorityEmoji} **${item.title}**\n`;
        if (item.description) {
          message += `   ${item.description}\n`;
        }
      });
      message += '\n';
    }
    
    if (analysisResult.risks && analysisResult.risks.length > 0) {
      message += `## ⚠️ 风险提醒\n`;
      analysisResult.risks.forEach((risk, index) => {
        message += `${index + 1}. ${risk.description}\n`;
        if (risk.mitigation) {
          message += `   💡 缓解措施: ${risk.mitigation}\n`;
        }
      });
      message += '\n';
    }
    
    if (analysisResult.recommendations && analysisResult.recommendations.length > 0) {
      message += `## 💡 建议\n`;
      analysisResult.recommendations.forEach((rec, index) => {
        message += `${index + 1}. ${rec}\n`;
      });
      message += '\n';
    }
    
    if (analysisResult.metadata) {
      message += `---\n*分析时间: ${new Date(analysisResult.metadata.analyzedAt).toLocaleString('zh-CN')}*`;
    }
    
    return message;
  }
}

export default AIService;
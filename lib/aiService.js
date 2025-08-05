import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { ChatOpenAI } from '@langchain/openai';

class AIService {
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
  createSystemPrompt() {
    return `你是一个专业的文档分析助手，专门分析 Confluence 页面内容。请根据用户的具体需求，对提供的文档内容进行深入分析。

你的分析应该包括：
1. 内容摘要：简洁地总结文档的主要内容
2. 关键信息提取：识别重要的信息点、决策、待办事项等
3. 行动建议：基于内容提出具体的行动建议
4. 风险识别：识别潜在的问题或风险点
5. 优先级评估：对发现的事项进行优先级排序

请确保你的分析：
- 准确且客观
- 结构化且易于理解
- 针对用户的具体需求
- 提供可执行的建议

输出格式请使用 JSON，包含以下字段：
{
  "summary": "内容摘要",
  "keyPoints": ["关键信息点1", "关键信息点2"],
  "actionItems": [
    {
      "title": "行动项标题",
      "description": "详细描述",
      "priority": "high|medium|low",
      "category": "分类",
      "estimatedEffort": "预估工作量"
    }
  ],
  "risks": [
    {
      "description": "风险描述",
      "impact": "high|medium|low",
      "mitigation": "缓解措施"
    }
  ],
  "recommendations": ["建议1", "建议2"],
  "nextSteps": ["下一步行动1", "下一步行动2"]
}`;
  }

  // 创建用户提示模板
  createUserPrompt(confluenceContent, userRequirement) {
    return `请分析以下 Confluence 文档内容，并根据我的具体需求进行分析：

**我的分析需求：**
${userRequirement}

**文档内容：**
${confluenceContent}

请根据上述需求，对文档内容进行深入分析，并按照指定的 JSON 格式返回结果。`;
  }

  // 分析 Confluence 内容
  async analyzeContent(confluenceContent, userRequirement) {
    try {
      const systemMessage = new SystemMessage(this.createSystemPrompt());
      const userMessage = new HumanMessage(
        this.createUserPrompt(confluenceContent, userRequirement)
      );

      console.log('开始AI分析...');
      const response = await this.llm.invoke([systemMessage, userMessage]);
      
      // 尝试解析JSON响应
      let analysisResult;
      try {
        // 提取JSON部分（如果响应包含其他文本）
        const jsonMatch = response.content.match(/\{[\s\S]*\}/);
        const jsonString = jsonMatch ? jsonMatch[0] : response.content;
        analysisResult = JSON.parse(jsonString);
      } catch (parseError) {
        console.warn('AI响应不是有效的JSON，使用备用解析方式');
        // 如果JSON解析失败，创建一个基本的结构
        analysisResult = {
          summary: this.extractSummary(response.content),
          keyPoints: this.extractKeyPoints(response.content),
          actionItems: this.extractActionItems(response.content),
          risks: [],
          recommendations: this.extractRecommendations(response.content),
          nextSteps: []
        };
      }

      // 添加元数据
      analysisResult.metadata = {
        analyzedAt: new Date().toISOString(),
        model: this.llm.modelName,
        userRequirement: userRequirement,
        contentLength: confluenceContent.length
      };

      console.log('AI分析完成');
      return analysisResult;

    } catch (error) {
      console.error('AI分析失败:', error);
      throw new Error(`AI分析失败: ${error.message}`);
    }
  }

  // 备用解析方法：提取摘要
  extractSummary(content) {
    const lines = content.split('\n');
    for (const line of lines) {
      if (line.includes('摘要') || line.includes('总结') || line.includes('Summary')) {
        return line.replace(/^[^:：]*[:：]\s*/, '').trim();
      }
    }
    return content.substring(0, 200) + '...';
  }

  // 备用解析方法：提取关键点
  extractKeyPoints(content) {
    const points = [];
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
  extractActionItems(content) {
    const actionItems = [];
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
  extractRecommendations(content) {
    const recommendations = [];
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
  formatResultForNotification(analysisResult) {
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
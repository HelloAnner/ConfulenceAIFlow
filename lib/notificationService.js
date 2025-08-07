class NotificationService {
  constructor() {
    this.supportedTypes = ['wechat', 'slack', 'email', 'webhook'];
  }

  // 发送通知
  async sendNotification(type, webhookUrl, content, title) {
    try {
      if (!this.supportedTypes.includes(type)) {
        throw new Error(`不支持的通知类型: ${type}`);
      }

      if (!webhookUrl) {
        console.log('未配置通知地址，跳过通知发送');
        return { success: true, message: '未配置通知地址' };
      }

      let payload;
      let headers = { 'Content-Type': 'application/json' };

      switch (type) {
        case 'wechat':
          payload = this.formatForWechat(content, title);
          break;
        
        case 'slack':
          payload = this.formatForSlack(content, title);
          break;
        
        case 'email':
          // 邮件通知需要特殊处理，这里暂时使用webhook方式
          payload = this.formatForEmail(content, title);
          break;
        
        case 'webhook':
        default:
          payload = this.formatForWebhook(content, title);
          break;
      }

      console.log(`发送${type}通知到: ${webhookUrl}`);
      
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`通知发送失败: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const responseData = await response.text();
      console.log('通知发送成功:', responseData);
      
      return { 
        success: true, 
        message: '通知发送成功',
        response: responseData
      };

    } catch (error) {
      console.error('发送通知失败:', error);
      return { 
        success: false, 
        error: error.message 
      };
    }
  }

  // 格式化微信通知
  formatForWechat(content, title) {
    // 处理换行符：将 \n 转换为 markdown 格式的换行
    let formattedContent = content;
    if (typeof content === 'string') {
      // 将 \n 替换为两个空格加换行符（markdown 换行格式）
      formattedContent = content.replace(/\\n/g, '  \n').replace(/\n/g, '  \n');
    }

    return {
      msgtype: 'markdown',
      markdown: {
        content: formattedContent
      }
    };
  }

  // 格式化Slack通知
  formatForSlack(content, title) {
    let textContent;
    if (typeof content === 'object') {
      textContent = this.formatAnalysisResultToText(content);
    } else {
      textContent = content;
    }

    return {
      text: title,
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: title
          }
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: textContent
          }
        }
      ]
    };
  }

  // 格式化邮件通知
  formatForEmail(content, title) {
    let htmlContent;
    if (typeof content === 'object') {
      htmlContent = this.formatAnalysisResultToHtml(content);
    } else {
      htmlContent = `<p>${content.replace(/\n/g, '<br>')}</p>`;
    }

    return {
      subject: title,
      html: htmlContent,
      text: typeof content === 'string' ? content : this.formatAnalysisResultToText(content)
    };
  }

  // 格式化通用Webhook通知
  formatForWebhook(content, title) {
    return {
      title: title,
      content: content,
      timestamp: new Date().toISOString(),
      type: 'confluence_ai_analysis'
    };
  }

  // 将AI分析结果格式化为Markdown
  formatAnalysisResultToMarkdown(result) {
    let markdown = '';
    
    if (result.summary) {
      markdown += `## 📋 内容摘要\n${result.summary}\n\n`;
    }
    
    if (result.keyPoints && result.keyPoints.length > 0) {
      markdown += `## 🔍 关键信息\n`;
      result.keyPoints.forEach((point, index) => {
        markdown += `${index + 1}. ${point}\n`;
      });
      markdown += '\n';
    }
    
    if (result.actionItems && result.actionItems.length > 0) {
      markdown += `## ✅ 行动项\n`;
      result.actionItems.forEach((item, index) => {
        const priorityEmoji = item.priority === 'high' ? '🔴' : item.priority === 'medium' ? '🟡' : '🟢';
        markdown += `${index + 1}. ${priorityEmoji} **${item.title}**\n`;
        if (item.description) {
          markdown += `   ${item.description}\n`;
        }
        if (item.estimatedEffort) {
          markdown += `   ⏱️ 预估工作量: ${item.estimatedEffort}\n`;
        }
      });
      markdown += '\n';
    }
    
    if (result.risks && result.risks.length > 0) {
      markdown += `## ⚠️ 风险提醒\n`;
      result.risks.forEach((risk, index) => {
        markdown += `${index + 1}. ${risk.description}\n`;
        if (risk.mitigation) {
          markdown += `   💡 缓解措施: ${risk.mitigation}\n`;
        }
      });
      markdown += '\n';
    }
    
    if (result.recommendations && result.recommendations.length > 0) {
      markdown += `## 💡 建议\n`;
      result.recommendations.forEach((rec, index) => {
        markdown += `${index + 1}. ${rec}\n`;
      });
      markdown += '\n';
    }
    
    if (result.nextSteps && result.nextSteps.length > 0) {
      markdown += `## 🚀 下一步行动\n`;
      result.nextSteps.forEach((step, index) => {
        markdown += `${index + 1}. ${step}\n`;
      });
      markdown += '\n';
    }
    
    if (result.metadata) {
      markdown += `---\n*分析时间: ${new Date(result.metadata.analyzedAt).toLocaleString('zh-CN')}*\n`;
      markdown += `*模型: ${result.metadata.model}*`;
    }
    
    return markdown;
  }

  // 将AI分析结果格式化为纯文本
  formatAnalysisResultToText(result) {
    return this.formatAnalysisResultToMarkdown(result)
      .replace(/[#*_`]/g, '') // 移除markdown标记
      .replace(/\n\n+/g, '\n\n'); // 合并多个换行
  }

  // 将AI分析结果格式化为HTML
  formatAnalysisResultToHtml(result) {
    let html = '<div style="font-family: Arial, sans-serif; line-height: 1.6;">';
    
    if (result.summary) {
      html += `<h2>📋 内容摘要</h2><p>${result.summary}</p>`;
    }
    
    if (result.keyPoints && result.keyPoints.length > 0) {
      html += '<h2>🔍 关键信息</h2><ul>';
      result.keyPoints.forEach(point => {
        html += `<li>${point}</li>`;
      });
      html += '</ul>';
    }
    
    if (result.actionItems && result.actionItems.length > 0) {
      html += '<h2>✅ 行动项</h2><ul>';
      result.actionItems.forEach(item => {
        const priorityColor = item.priority === 'high' ? 'red' : item.priority === 'medium' ? 'orange' : 'green';
        html += `<li><strong style="color: ${priorityColor}">${item.title}</strong>`;
        if (item.description) {
          html += `<br><span style="margin-left: 20px;">${item.description}</span>`;
        }
        html += '</li>';
      });
      html += '</ul>';
    }
    
    if (result.risks && result.risks.length > 0) {
      html += '<h2>⚠️ 风险提醒</h2><ul>';
      result.risks.forEach(risk => {
        html += `<li>${risk.description}`;
        if (risk.mitigation) {
          html += `<br><em>缓解措施: ${risk.mitigation}</em>`;
        }
        html += '</li>';
      });
      html += '</ul>';
    }
    
    if (result.recommendations && result.recommendations.length > 0) {
      html += '<h2>💡 建议</h2><ul>';
      result.recommendations.forEach(rec => {
        html += `<li>${rec}</li>`;
      });
      html += '</ul>';
    }
    
    if (result.metadata) {
      html += `<hr><p><em>分析时间: ${new Date(result.metadata.analyzedAt).toLocaleString('zh-CN')}</em></p>`;
    }
    
    html += '</div>';
    return html;
  }

  // 批量发送通知
  async sendBatchNotifications(notifications) {
    const results = [];
    
    for (const notification of notifications) {
      const { type, webhookUrl, content, title } = notification;
      const result = await this.sendNotification(type, webhookUrl, content, title);
      results.push({
        ...notification,
        result
      });
    }
    
    return results;
  }
}

export default NotificationService;
class ConfluenceService {
  private baseUrl: string | null;
  private username: string | null;
  private apiToken: string | null;

  constructor() {
    this.baseUrl = null;
    this.username = null;
    this.apiToken = null;
    this.initializeFromEnv();
  }

  // 从环境变量初始化
  initializeFromEnv(): void {
    if (process.env.CONFLUENCE_USERNAME && process.env.CONFLUENCE_API_TOKEN && process.env.CONFLUENCE_BASE_URL) {
      this.baseUrl = process.env.CONFLUENCE_BASE_URL.replace(/\/$/, '');
      this.username = process.env.CONFLUENCE_USERNAME;
      this.apiToken = process.env.CONFLUENCE_API_TOKEN;
    }
  }

  // 设置连接信息
  setConnection(baseUrl: string, username: string, apiToken: string): void {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.username = username;
    this.apiToken = apiToken;
  }

  // 获取认证头
  getAuthHeaders(): any {
    if (!this.username || !this.apiToken) {
      throw new Error('Confluence认证信息未配置');
    }

    const auth = Buffer.from(`${this.username}:${this.apiToken}`).toString('base64');
    return {
      'Authorization': `Basic ${auth}`,
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    };
  }

  // REST API调用封装
  async makeRequest(endpoint: string, options: any = {}): Promise<any> {
    if (!this.baseUrl) {
      throw new Error('Confluence连接未配置，请先调用setConnection方法');
    }

    const url = `${this.baseUrl}/rest/api${endpoint}`;
    const headers = this.getAuthHeaders();

    console.log(`发起REST API请求: ${url}`);

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers,
        ...options
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`API请求失败: ${response.status} ${response.statusText}`, errorText);
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('API请求成功，返回数据类型:', typeof data);
      return data;
    } catch (error: any) {
      console.error('REST API调用失败:', error);
      throw error;
    }
  }

  // 从URL中提取页面ID
  extractPageIdFromUrl(url: string): string {
    console.log('正在从URL提取页面ID:', url);

    // 支持多种Confluence URL格式
    const patterns = [
      /\/pages\/viewpage\.action\?pageId=(\d+)/,
      /\/spaces\/[^/]+\/pages\/(\d+)/,
      /\/wiki\/spaces\/[^/]+\/pages\/(\d+)/,
      /pageId=(\d+)/
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) {
        console.log('成功提取页面ID:', match[1]);
        return match[1];
      }
    }

    console.error('无法从URL中提取页面ID:', url);
    throw new Error('无法从URL中提取页面ID，请检查URL格式');
  }

  // 获取页面内容
  async getPageContent(pageId: string): Promise<any> {
    console.log('正在获取页面内容，页面ID:', pageId);
    console.log('Confluence配置信息:', {
      baseUrl: this.baseUrl,
      username: this.username,
      hasApiToken: !!this.apiToken
    });

    try {
      const endpoint = `/content/${pageId}?expand=body.storage,version,space,ancestors,body.view,metadata.labels`;
      const page = await this.makeRequest(endpoint);

      console.log('获取到页面数据:', {
        id: page.id,
        title: page.title,
        hasContent: !!page.body?.storage?.value
      });

      if (!page || !page.id) {
        console.error('页面数据无效:', page);
        throw new Error('页面数据无效：缺少页面ID');
      }

      return {
        id: page.id,
        title: page.title || '无标题',
        content: page.body?.storage?.value || '',
        space: page.space?.name || '未知空间',
        spaceKey: page.space?.key || '',
        version: page.version?.number || 1,
        url: `${this.baseUrl}/pages/viewpage.action?pageId=${page.id}`,
        lastModified: page.version?.when || new Date().toISOString(),
        lastModifiedBy: page.version?.by?.displayName || page.version?.by?.username || '未知用户',
        createdBy: page.history?.createdBy?.displayName || page.history?.createdBy?.username || '未知用户',
        createdDate: page.history?.createdDate || page.version?.when || new Date().toISOString(),
        labels: page.metadata?.labels?.results?.map((label: { name: string }) => label.name) || [],
        ancestors: page.ancestors || []
      };
    } catch (error: any) {
      console.error('获取页面内容失败:', error);

      // 处理具体的错误类型
      if (error instanceof Error && error.message.includes('HTTP 404')) {
        throw new Error(`页面不存在或已被删除 (页面ID: ${pageId})`);
      } else if (error instanceof Error && error.message.includes('HTTP 401')) {
        throw new Error('认证失败，请检查用户名和API Token');
      } else if (error instanceof Error && error.message.includes('HTTP 403')) {
        throw new Error('权限不足，无法访问该页面');
      } else {
        throw new Error(`获取页面内容失败: ${error}`);
      }
    }
  }

  // 使用REST API获取子页面列表（兼容老版本Confluence）
  async getChildPages(pageId: string, limit = 100): Promise<any[]> {
    console.log('正在获取子页面，父页面ID:', pageId);
    
    try {
      const endpoint = `/content/${pageId}/child/page?expand=body.storage,version,space&limit=${limit}`;
      const data = await this.makeRequest(endpoint);

      if (!data.results || !Array.isArray(data.results)) {
        console.log('没有找到子页面');
        return [];
      }

      // 获取每个子页面的完整内容
      const childPages = [];
      for (const page of data.results) {
        if (!page || !page.id) {
          console.warn('跳过无效的页面数据:', page);
          continue;
        }

        try {
          // 获取完整的页面内容
          const fullPage = await this.getPageContent(page.id);
          childPages.push(fullPage);
        } catch (error: any) {
          console.warn(`获取子页面 ${page.id} 内容失败:`, error);
          // 使用基本信息作为备选
          childPages.push({
            id: page.id,
            title: page.title || '无标题',
            content: page.body?.storage?.value || '',
            url: `${this.baseUrl}/pages/viewpage.action?pageId=${page.id}`,
            lastModified: page.version?.when || new Date().toISOString(),
            version: page.version?.number || 1
          });
        }
      }

      console.log(`获取到 ${childPages.length} 个子页面`);
      return childPages;
    } catch (error: any) {
      console.error('获取子页面失败:', error);
      throw new Error(`获取子页面失败: ${error}`);
    }
  }

  // 搜索页面
  async searchPages(query: string, spaceKey: string | null = null): Promise<any[]> {
    console.log('正在搜索页面，查询:', query, '空间:', spaceKey);

    try {
      let cql = `title ~ "${query}" OR text ~ "${query}"`;
      if (spaceKey) {
        cql += ` AND space = "${spaceKey}"`;
      }

      const endpoint = `/content/search?cql=${encodeURIComponent(cql)}&expand=body.storage,version,space`;
      const response = await this.makeRequest(endpoint);

      console.log(`搜索到 ${response.results?.length || 0} 个页面`);
      return response.results || [];
    } catch (error: any) {
      console.error('搜索页面失败:', error);
      throw new Error(`搜索页面失败: ${error}`);
    }
  }

  // 获取空间信息
  async getSpaceInfo(spaceKey: string): Promise<any> {
    console.log('正在获取空间信息，空间键:', spaceKey);

    try {
      const endpoint = `/space/${spaceKey}`;
      const space = await this.makeRequest(endpoint);

      console.log('获取到空间信息:', space.name);
      return space;
    } catch (error: any) {
      console.error('获取空间信息失败:', error);
      throw new Error(`获取空间信息失败: ${error}`);
    }
  }

  // 获取页面评论（只返回最新版本的评论）
  async getPageComments(pageId: string): Promise<any[]> {
    console.log('正在获取页面评论，页面ID:', pageId);

    try {
      const endpoint = `/content/${pageId}/child/comment?expand=body.storage,version,body.view,metadata.labels`;
      const response = await this.makeRequest(endpoint);

      // 过滤掉版本1的评论，只保留最新版本的评论
      const latestComments = (response.results || []).filter((comment: { version?: { number: number } }) => {
        return comment.version && comment.version.number > 1;
      });

      console.log(`获取到 ${response.results?.length || 0} 条评论，过滤后剩余 ${latestComments.length} 条最新评论`);
      return latestComments;
    } catch (error: any) {
      console.error('获取页面评论失败:', error);
      // 评论获取失败不应该影响主流程，返回空数组
      return [];
    }
  }

  // 获取最新的子页面（只返回最新的一个）
  async getLatestChildPages(pageId: string): Promise<any | null> {
    try {
      const childPages = await this.getChildPages(pageId, 100);
      return childPages.length > 0 ? childPages[childPages.length - 1] : null;
    } catch (error: any) {
      console.error('获取最新子页面失败:', error);
      throw new Error(`获取最新子页面失败: ${error}`);
    }
  }

  // 根据类型获取内容
  async getContentByType(url: string, type = 'current'): Promise<string> {
    try {
      const pageId = this.extractPageIdFromUrl(url);
      let pages = [];
      let pageType = type;

      switch (type) {
        case 'current':
          // 只获取当前页面
          const currentPage = await this.getPageContent(pageId);
          pages = [currentPage];
          pageType = 'current';
          break;

        case 'all-children':
          // 获取当前页面和所有子页面
          const mainPage = await this.getPageContent(pageId);
          const allChildren = await this.getChildPages(pageId);
          pages = [mainPage, ...allChildren];
          pageType = 'all-children';
          break;

        case 'latest-children':
          // 获取当前页面和最新的子页面
          const basePage = await this.getPageContent(pageId);
          const latestChild = await this.getLatestChildPages(pageId);
          pages = latestChild ? [basePage, latestChild] : [basePage];
          pageType = 'latest-children';
          break;

        default:
          throw new Error(`不支持的内容类型: ${type}`);
      }

      // 验证页面数据
      if (!pages || pages.length === 0) {
        throw new Error('未获取到任何页面内容');
      }

      // 验证每个页面都有必要的属性
      pages.forEach((page, index) => {
        if (!page || !page.id) {
          throw new Error(`第${index + 1}个页面数据无效：缺少页面ID`);
        }
      });

      // 为每个页面获取评论并拼接所有内容
      let allContent = '';

      for (let i = 0; i < pages.length; i++) {
        const page = pages[i];

        // 添加页面标题和元数据
        allContent += `\n\n=== 页面 ${i + 1}: ${page.title} ===\n`;
        allContent += `URL: ${page.url}\n`;
        allContent += `空间: ${page.space?.name || '未知空间'} (${page.spaceKey || '未知空间键'})\n`;
        allContent += `创建者: ${page.history?.createdBy?.displayName || '未知用户'}\n`;
        allContent += `创建时间: ${page.createdDate}\n`;
        allContent += `最后修改者: ${page.lastModifiedBy?.displayName || '未知用户'}\n`;
        allContent += `最后修改时间: ${page.lastModified}\n`;
        allContent += `版本: ${page.version?.number || 1}\n`;

        // 添加标签信息（如果有）
        if (page.history?.metadata?.labels && page.history?.metadata?.labels.length > 0) {
          allContent += `标签: ${page.history?.metadata?.labels.join(', ')}\n`;
        }
        allContent += '\n';

        // 添加页面正文内容
        const textContent = this.extractTextFromHtml(page.content);
        if (textContent) {
          allContent += `页面内容:\n${textContent}\n\n`;
        }

        // 获取并添加评论内容
        const comments = await this.getPageComments(page.id);
        if (comments.length > 0) {
          allContent += `评论 (${comments.length} 条):\n`;
          comments.forEach((comment, commentIndex) => {
            const commentText = this.extractTextFromHtml(comment.body?.storage?.value || '');
            const commentAuthor = comment.history?.createdBy?.displayName || comment.history?.createdBy?.username || comment.version?.by?.displayName || comment.version?.by?.username || '未知用户';
            const commentDate = comment.history?.createdDate || comment.version?.when || '未知时间';
            const commentVersion = comment.version?.number || 1;
            const commentLabels = comment.metadata?.labels?.results?.map((label: { name: string }) => label.name) || [];

            if (commentText) {
              allContent += `评论 ${commentIndex + 1} (作者: ${commentAuthor}, 时间: ${commentDate}, 版本: ${commentVersion}`;
              if (commentLabels.length > 0) {
                allContent += `, 标签: ${commentLabels.join(', ')}`;
              }
              allContent += `):\n${commentText}\n\n`;
            }
          });
        }

        allContent += '---\n';
      }

      console.log(`已拼接 ${pages.length} 个页面的内容和评论`);
      console.log(allContent);
      return allContent;
    } catch (error: any) {
      console.error('获取内容失败:', error);
      throw new Error(`获取内容失败: ${error.message}`);
    }
  }

  // 将页面内容转换为纯文本（保留结构信息和@用户信息）
  extractTextFromHtml(html: string): string {
    if (!html) return '';
    
    // 保留更多结构信息的HTML处理
    return html
      // 保留@用户信息 - 先处理最常见的格式
      // 1. 处理Confluence标准用户链接格式
      .replace(/<ac:link[^>]*><ri:user[^>]*ri:username=["']([^"']*)["'][^>]*\/><\/ac:link>/gi, '@$1')
      .replace(/<ac:link[^>]*><ri:user[^>]*ri:userkey=["']([^"']*)["'][^>]*\/><ac:plain-text-link-body><\!\[CDATA\[([^\]]*)\]\]><\/ac:plain-text-link-body><\/ac:link>/gi, '@$2')
      .replace(/<ac:link[^>]*><ri:user[^>]*ri:username=["']([^"']*)["'][^>]*><ac:plain-text-link-body><\!\[CDATA\[([^\]]*)\]\]><\/ac:plain-text-link-body><\/ri:user><\/ac:link>/gi, '@$2')

      // 2. 处理span和a标签格式
      .replace(/<span[^>]*data-username=["']([^"']*)["'][^>]*>([^<]*)<\/span>/gi, '@$2')
      .replace(/<a[^>]*data-username=["']([^"']*)["'][^>]*>([^<]*)<\/a>/gi, '@$2')
      .replace(/<span[^>]*class=["'][^"']*mention[^"']*["'][^>]*data-username=["']([^"']*)["'][^>]*>([^<]*)<\/span>/gi, '@$2')
      .replace(/<span[^>]*class=["'][^"']*user-mention[^"']*["'][^>]*>@?([^<]*)<\/span>/gi, '@$1')
      .replace(/<a[^>]*class=["'][^"']*user-mention[^"']*["'][^>]*>@?([^<]*)<\/a>/gi, '@$1')
      .replace(/<span[^>]*class=["'][^"']*confluence-userlink[^"']*["'][^>]*>([^<]*)<\/span>/gi, '@$1')

      // 3. 通用处理：任何标签包裹的用户名格式（包含英文、中文、数字、点、连字符）
      .replace(/<[^>]*>([A-Za-z][A-Za-z0-9._\u4e00-\u9fff-]*)<\/[^>]*>/gi, (match, content) => {
        // 检查是否是用户名格式：以字母开头，包含字母、数字、中文、点、连字符
        if (/^[A-Za-z][A-Za-z0-9._\u4e00-\u9fff-]*$/.test(content) && content.length > 1) {
          return '@' + content;
        }
        return match;
      })

      // 4. 处理直接出现在文本中的用户名（不被HTML包裹）
      .replace(/\b([A-Za-z][A-Za-z0-9._-]*[\u4e00-\u9fff]+[A-Za-z0-9._\u4e00-\u9fff-]*|[A-Za-z][A-Za-z0-9._-]*\.[A-Za-z][A-Za-z0-9._\u4e00-\u9fff-]*)\b/g, '@$1')

      // 5. 保留已存在的@用户格式
      .replace(/@([A-Za-z0-9._\u4e00-\u9fff-]+)/g, '@$1')

      // 保留段落和换行结构
      .replace(/<\/p>/gi, '\n\n')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/div>/gi, '\n')
      .replace(/<\/h[1-6]>/gi, '\n\n')

      // 保留列表结构
      .replace(/<li[^>]*>/gi, '• ')
      .replace(/<\/li>/gi, '\n')
      .replace(/<\/ul>/gi, '\n')
      .replace(/<\/ol>/gi, '\n')

      // 保留表格结构
      .replace(/<\/td>/gi, ' | ')
      .replace(/<\/th>/gi, ' | ')
      .replace(/<\/tr>/gi, '\n')
      .replace(/<\/table>/gi, '\n\n')

      // 保留强调和链接信息
      .replace(/<strong[^>]*>([^<]*)<\/strong>/gi, '**$1**')
      .replace(/<b[^>]*>([^<]*)<\/b>/gi, '**$1**')
      .replace(/<em[^>]*>([^<]*)<\/em>/gi, '*$1*')
      .replace(/<i[^>]*>([^<]*)<\/i>/gi, '*$1*')
      .replace(/<a[^>]*href=["']([^"']*)["'][^>]*>([^<]*)<\/a>/gi, '$2 ($1)')

      // 保留代码块和内联代码
      .replace(/<code[^>]*>([^<]*)<\/code>/gi, '`$1`')
      .replace(/<pre[^>]*>([^<]*)<\/pre>/gi, '\n```\n$1\n```\n')

      // 保留引用块
      .replace(/<blockquote[^>]*>/gi, '> ')
      .replace(/<\/blockquote>/gi, '\n')

      // 保留Confluence特有的宏内容
      .replace(/<ac:structured-macro[^>]*ac:name=["']([^"']*)["'][^>]*>([\s\S]*?)<\/ac:structured-macro>/gi, '[宏: $1] $2')
      .replace(/<ac:plain-text-body><\!\[CDATA\[([^\]]*)\]\]><\/ac:plain-text-body>/gi, '$1')
      
      // 移除剩余的HTML标签
      .replace(/<[^>]*>/g, '')
      
      // 处理HTML实体
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&apos;/g, "'")

      // 清理多余的空白字符
      .replace(/\n\s*\n\s*\n/g, '\n\n') // 合并多个连续换行
      .replace(/[ \t]+/g, ' ') // 合并多个空格和制表符
      .replace(/^\s+|\s+$/gm, '') // 移除行首行尾空格
      .trim();
  }
}

export default ConfluenceService;
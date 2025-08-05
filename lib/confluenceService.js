import ConfluenceAPI from 'confluence-api';

class ConfluenceService {
  constructor() {
    this.confluence = new ConfluenceAPI({
      username: process.env.CONFLUENCE_USERNAME,
      password: process.env.CONFLUENCE_API_TOKEN,
      baseUrl: process.env.CONFLUENCE_BASE_URL,
      version: 4 // API version
    });
  }

  // 从URL中提取页面ID
  extractPageIdFromUrl(url) {
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
        return match[1];
      }
    }

    throw new Error('无法从URL中提取页面ID，请检查URL格式');
  }

  // 获取页面内容
  async getPageContent(pageId) {
    try {
      const page = await this.confluence.getContentById(pageId, {
        expand: 'body.storage,version,space,ancestors'
      });

      return {
        id: page.id,
        title: page.title,
        content: page.body.storage.value,
        space: page.space.name,
        version: page.version.number,
        url: `${process.env.CONFLUENCE_BASE_URL}/pages/viewpage.action?pageId=${page.id}`,
        lastModified: page.version.when,
        ancestors: page.ancestors || []
      };
    } catch (error) {
      console.error('获取页面内容失败:', error);
      throw new Error(`获取页面内容失败: ${error.message}`);
    }
  }

  // 获取子页面列表
  async getChildPages(pageId, limit = 50) {
    try {
      const children = await this.confluence.getChildren(pageId, {
        expand: 'page.body.storage,page.version',
        limit: limit
      });

      return children.page.results.map(page => ({
        id: page.id,
        title: page.title,
        content: page.body?.storage?.value || '',
        url: `${process.env.CONFLUENCE_BASE_URL}/pages/viewpage.action?pageId=${page.id}`,
        lastModified: page.version.when,
        version: page.version.number
      }));
    } catch (error) {
      console.error('获取子页面失败:', error);
      throw new Error(`获取子页面失败: ${error.message}`);
    }
  }

  // 获取最新的子页面
  async getLatestChildPages(pageId, limit = 10) {
    try {
      const children = await this.getChildPages(pageId, 100); // 先获取更多页面
      
      // 按最后修改时间排序，获取最新的
      return children
        .sort((a, b) => new Date(b.lastModified) - new Date(a.lastModified))
        .slice(0, limit);
    } catch (error) {
      console.error('获取最新子页面失败:', error);
      throw new Error(`获取最新子页面失败: ${error.message}`);
    }
  }

  // 根据页面类型获取内容
  async getContentByType(confluenceUrl, pageType = 'current') {
    try {
      const pageId = this.extractPageIdFromUrl(confluenceUrl);
      let pages = [];

      switch (pageType) {
        case 'current':
          // 只获取当前页面
          const currentPage = await this.getPageContent(pageId);
          pages = [currentPage];
          break;

        case 'all_children':
          // 获取当前页面和所有子页面
          const mainPage = await this.getPageContent(pageId);
          const allChildren = await this.getChildPages(pageId);
          pages = [mainPage, ...allChildren];
          break;

        case 'latest_children':
          // 获取当前页面和最新的子页面
          const basePage = await this.getPageContent(pageId);
          const latestChildren = await this.getLatestChildPages(pageId);
          pages = [basePage, ...latestChildren];
          break;

        default:
          throw new Error(`不支持的页面类型: ${pageType}`);
      }

      return {
        pageType,
        totalPages: pages.length,
        pages: pages,
        retrievedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('获取Confluence内容失败:', error);
      throw error;
    }
  }

  // 将页面内容转换为纯文本（移除HTML标签）
  extractTextFromHtml(html) {
    if (!html) return '';
    
    // 简单的HTML标签移除（生产环境建议使用专门的HTML解析库）
    return html
      .replace(/<[^>]*>/g, '') // 移除HTML标签
      .replace(/&nbsp;/g, ' ') // 替换空格实体
      .replace(/&amp;/g, '&') // 替换&实体
      .replace(/&lt;/g, '<') // 替换<实体
      .replace(/&gt;/g, '>') // 替换>实体
      .replace(/&quot;/g, '"') // 替换引号实体
      .replace(/\s+/g, ' ') // 合并多个空格
      .trim();
  }

  // 格式化页面内容用于AI处理
  formatPagesForAI(pagesData) {
    const { pages, pageType, totalPages } = pagesData;
    
    let formattedContent = `# Confluence 页面内容分析\n\n`;
    formattedContent += `**获取类型**: ${pageType}\n`;
    formattedContent += `**页面数量**: ${totalPages}\n\n`;

    pages.forEach((page, index) => {
      formattedContent += `## 页面 ${index + 1}: ${page.title}\n\n`;
      formattedContent += `**URL**: ${page.url}\n`;
      formattedContent += `**最后修改**: ${page.lastModified}\n`;
      formattedContent += `**版本**: ${page.version}\n\n`;
      
      const textContent = this.extractTextFromHtml(page.content);
      if (textContent) {
        formattedContent += `**内容**:\n${textContent}\n\n`;
      } else {
        formattedContent += `**内容**: 无文本内容\n\n`;
      }
      
      formattedContent += `---\n\n`;
    });

    return formattedContent;
  }
}

export default ConfluenceService;
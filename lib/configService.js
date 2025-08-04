import fs from 'fs-extra';
import path from 'path';
import crypto from 'crypto';

const CONFIG_FILE_PATH = process.env.CONFIG_FILE_PATH || './data/configs.json';

class ConfigService {
  constructor() {
    this.configs = [];
    this.loadConfigs();
  }

  // 从文件加载配置
  async loadConfigs() {
    try {
      const configPath = path.resolve(CONFIG_FILE_PATH);
      if (await fs.pathExists(configPath)) {
        const data = await fs.readJson(configPath);
        this.configs = data || [];
        console.log(`已加载 ${this.configs.length} 个配置`);
      } else {
        console.log('配置文件不存在，使用空配置');
        this.configs = [];
      }
    } catch (error) {
      console.error('加载配置文件失败:', error);
      this.configs = [];
    }
  }

  // 保存配置到文件
  async saveConfigs() {
    try {
      const configPath = path.resolve(CONFIG_FILE_PATH);
      await fs.ensureDir(path.dirname(configPath));
      await fs.writeJson(configPath, this.configs, { spaces: 2 });
      console.log(`已保存 ${this.configs.length} 个配置到文件`);
    } catch (error) {
      console.error('保存配置文件失败:', error);
      throw error;
    }
  }

  // 获取所有配置
  getAllConfigs() {
    return this.configs;
  }

  // 根据ID获取配置
  getConfigById(id) {
    return this.configs.find(config => config.id === id);
  }

  // 添加新配置
  async addConfig(config) {
    const newConfig = {
      ...config,
      id: Date.now(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: 'active'
    };
    
    this.configs.push(newConfig);
    await this.saveConfigs();
    return newConfig;
  }

  // 更新配置
  async updateConfig(id, updates) {
    const index = this.configs.findIndex(config => config.id === id);
    if (index === -1) {
      throw new Error('配置不存在');
    }

    this.configs[index] = {
      ...this.configs[index],
      ...updates,
      updatedAt: new Date().toISOString()
    };

    await this.saveConfigs();
    return this.configs[index];
  }

  // 删除配置
  async deleteConfig(id) {
    const index = this.configs.findIndex(config => config.id === id);
    if (index === -1) {
      throw new Error('配置不存在');
    }

    const deletedConfig = this.configs.splice(index, 1)[0];
    await this.saveConfigs();
    return deletedConfig;
  }

  // 获取活跃配置（用于调度器）
  getActiveConfigs() {
    return this.configs.filter(config => config.status === 'active' && config.cronExpression);
  }
}

// 创建单例实例
const configService = new ConfigService();

export default configService;
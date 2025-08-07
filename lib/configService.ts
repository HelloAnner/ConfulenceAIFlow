import fs from 'fs-extra';
import path from 'path';
import { Config } from '@/types';

const CONFIG_FILE_PATH = process.env.CONFIG_FILE_PATH || './data/configs.json';

class ConfigService {
  private configs: Config[];
  private initialized: boolean;
  private initPromise: Promise<void>;

  constructor() {
    this.configs = [];
    this.initialized = false;
    this.initPromise = this.loadConfigs();
  }

  // 确保配置已加载
  async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await this.initPromise;
    }
  }

  // 从文件加载配置
  async loadConfigs(): Promise<void> {
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
    } catch (error: any) {
      console.error('加载配置文件失败:', error);
      this.configs = [];
    } finally {
      this.initialized = true;
    }
  }

  // 保存配置到文件
  async saveConfigs(): Promise<void> {
    try {
      const configPath = path.resolve(CONFIG_FILE_PATH);
      await fs.ensureDir(path.dirname(configPath));
      await fs.writeJson(configPath, this.configs, { spaces: 2 });
      console.log(`已保存 ${this.configs.length} 个配置到文件`);
    } catch (error: any) {
      console.error('保存配置文件失败:', error);
      throw error;
    }
  }

  // 获取所有配置
  async getAllConfigs(): Promise<Config[]> {
    await this.ensureInitialized();
    return this.configs;
  }

  // 根据ID获取配置
  async getConfigById(id: string | number): Promise<Config | undefined> {
    await this.ensureInitialized();
    return this.configs.find(config => config.id === id);
  }

  // 添加新配置
  async addConfig(config: Omit<Config, 'id' | 'createdAt' | 'updatedAt' | 'status'>): Promise<Config> {
    const newConfig: Config = {
      ...config,
      id: Date.now(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: 'active'
    };
    
    this.configs.push(newConfig);
    console.log("添加配置", newConfig)
    await this.saveConfigs();
    return newConfig;
  }

  // 更新配置
  async updateConfig(id: string | number, updates: Partial<Config>): Promise<Config> {
    await this.ensureInitialized();
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
  async deleteConfig(id: string | number): Promise<Config> {
    await this.ensureInitialized();
    const index = this.configs.findIndex(config => config.id === id);
    if (index === -1) {
      throw new Error('配置不存在');
    }

    const deletedConfig = this.configs.splice(index, 1)[0];
    await this.saveConfigs();
    return deletedConfig;
  }

  // 获取活跃配置（用于调度器）
  async getActiveConfigs(): Promise<Config[]> {
    await this.ensureInitialized();
    return this.configs.filter(config => config.status === 'active' && config.cronExpression);
  }
}

// 创建单例实例
const configService = new ConfigService();

export default configService;
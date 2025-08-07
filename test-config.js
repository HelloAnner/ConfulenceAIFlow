// 测试配置服务
import configService from './lib/configService';
import schedulerService from './lib/schedulerService';

async function testConfigManagement() {
  console.log('🧪 开始测试配置管理功能...');
  
  try {
    // 1. 测试添加配置
    console.log('\n1. 测试添加配置...');
    const testConfig = {
      title: '测试配置',
      confluenceUrl: 'https://example.atlassian.net/wiki/spaces/TEST/pages/123456',
      description: '这是一个测试配置，用于验证AI分析功能',
      notificationType: 'wechat',
      webhookUrl: 'https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=test',
      notificationTemplate: '📋 AI分析报告\n\n{{content}}\n\n---\n测试配置执行完成',
      pageType: 'current',
      cronExpression: '0 9 * * 1-5' // 工作日上午9点
    };
    
    const newConfig = configService.addConfig(testConfig);
    console.log('✅ 配置添加成功:', newConfig.id);
    
    // 2. 测试获取配置
    console.log('\n2. 测试获取配置...');
    const retrievedConfig = configService.getConfigById(newConfig.id);
    console.log('✅ 配置获取成功:', retrievedConfig.title);
    console.log('   通知模板:', retrievedConfig.notificationTemplate);
    
    // 3. 测试更新配置
    console.log('\n3. 测试更新配置...');
    const updatedData = {
      ...retrievedConfig,
      title: '更新后的测试配置',
      notificationTemplate: '🔄 更新的AI分析报告\n\n{{content}}\n\n---\n配置已更新'
    };
    
    const updatedConfig = configService.updateConfig(newConfig.id, updatedData);
    console.log('✅ 配置更新成功:', updatedConfig.title);
    
    // 4. 测试调度器功能
    console.log('\n4. 测试调度器功能...');
    schedulerService.addJob(updatedConfig);
    const jobStatus = schedulerService.getJobStatus(newConfig.id);
    console.log('✅ 定时任务创建成功:', jobStatus);
    
    // 5. 测试获取所有配置
    console.log('\n5. 测试获取所有配置...');
    const allConfigs = configService.getAllConfigs();
    console.log('✅ 获取所有配置成功，总数:', allConfigs.length);
    
    // 6. 清理测试数据
    console.log('\n6. 清理测试数据...');
    schedulerService.removeJob(newConfig.id);
    configService.deleteConfig(newConfig.id);
    console.log('✅ 测试数据清理完成');
    
    console.log('\n🎉 所有测试通过！配置管理功能正常工作。');
    
  } catch (error) {
    console.error('❌ 测试失败:', error);
    process.exit(1);
  }
}

// 运行测试
testConfigManagement();
/**
 * 批次管理器 - 管理机器人批量生成过程
 */

class BatchManager {
  constructor() {
    this.batches = new Map();
    this.currentBatchId = 0;
    this.globalConfig = {
      platformLaunchDate: "2026-02-01",
      binanceChainDate: "2026-03-23",
      currentDate: "2026-04-08",
      baseWalletPrefix: "0x",
      schemaVersion: "4.1.0"
    };
  }

  /**
   * 创建新的生成批次
   */
  createBatch(config) {
    const batchId = `batch_${++this.currentBatchId}`;
    const batch = {
      id: batchId,
      config: {
        batchSize: config.batchSize || 5,
        startId: config.startId || 49,
        targetClusters: config.targetClusters || [],
        qualityLevel: config.qualityLevel || 'detailed',
        ...config
      },
      status: 'created',
      progress: {
        total: config.batchSize || 5,
        completed: 0,
        failed: 0,
        errors: []
      },
      createdAt: new Date(),
      bots: []
    };

    this.batches.set(batchId, batch);
    console.log(`✅ 创建批次 ${batchId}: ${batch.config.batchSize}个机器人`);
    return batch;
  }

  /**
   * 执行批次生成
   */
  async executeBatch(batch) {
    console.log(`🚀 开始执行批次 ${batch.id}`);
    batch.status = 'executing';
    
    try {
      for (let i = 0; i < batch.config.batchSize; i++) {
        const botId = batch.config.startId + i;
        console.log(`📝 生成机器人 BOT_${String(botId).padStart(3, '0')}`);
        
        try {
          const bot = await this.generateSingleBot(botId, batch.config);
          batch.bots.push(bot);
          batch.progress.completed++;
          
          console.log(`✅ BOT_${String(botId).padStart(3, '0')} 生成完成`);
        } catch (error) {
          batch.progress.failed++;
          batch.progress.errors.push({
            botId: `BOT_${String(botId).padStart(3, '0')}`,
            error: error.message,
            timestamp: new Date()
          });
          console.error(`❌ BOT_${String(botId).padStart(3, '0')} 生成失败:`, error.message);
        }
      }

      batch.status = batch.progress.failed > 0 ? 'completed_with_errors' : 'completed';
      batch.completedAt = new Date();
      
      console.log(`🎉 批次 ${batch.id} 执行完成: ${batch.progress.completed}成功, ${batch.progress.failed}失败`);
      return batch;
      
    } catch (error) {
      batch.status = 'failed';
      batch.error = error.message;
      console.error(`💥 批次 ${batch.id} 执行失败:`, error.message);
      throw error;
    }
  }

  /**
   * 生成单个机器人
   */
  async generateSingleBot(botId, config) {
    const TemplateEngine = require('./TemplateEngine');
    const templateEngine = new TemplateEngine();
    
    // 根据botId确定机器人特征
    const botSpec = this.getBotSpecification(botId, config);
    
    // 生成完整配置
    const botConfig = await templateEngine.generateFullConfig(botSpec);
    
    // 验证配置
    this.validateBotConfig(botConfig);
    
    return botConfig;
  }

  /**
   * 根据botId获取机器人规格
   */
  getBotSpecification(botId, config) {
    // 预定义的机器人规格
    const botSpecs = {
      49: { occupation: 'driver', location: 'shenzhen', origin: 'hunan', cluster: 'driver_group' },
      50: { occupation: 'driver', location: 'guangzhou', origin: 'guangdong', cluster: 'driver_group' },
      51: { occupation: 'driver', location: 'dongguan', origin: 'sichuan', cluster: 'driver_group' },
      52: { occupation: 'driver', location: 'shenzhen', origin: 'henan', cluster: 'driver_group' },
      53: { occupation: 'driver', location: 'shenzhen', origin: 'hubei', cluster: 'driver_group' },
      54: { occupation: 'factory_worker', location: 'shenzhen', origin: 'hunan', cluster: 'factory_group' },
      55: { occupation: 'factory_worker', location: 'dongguan', origin: 'guangdong', cluster: 'factory_group' },
      56: { occupation: 'factory_worker', location: 'shenzhen', origin: 'sichuan', cluster: 'factory_group' },
      57: { occupation: 'factory_worker', location: 'guangzhou', origin: 'henan', cluster: 'factory_group' },
      58: { occupation: 'factory_worker', location: 'shenzhen', origin: 'hubei', cluster: 'factory_group' },
      59: { occupation: 'small_business', location: 'shenzhen', origin: 'hunan', cluster: 'business_group' },
      60: { occupation: 'small_business', location: 'guangzhou', origin: 'guangdong', cluster: 'business_group' },
      61: { occupation: 'small_business', location: 'dongguan', origin: 'sichuan', cluster: 'business_group' },
      62: { occupation: 'small_business', location: 'shenzhen', origin: 'henan', cluster: 'business_group' },
      63: { occupation: 'small_business', location: 'shenzhen', origin: 'fujian', cluster: 'business_group' }
    };

    const spec = botSpecs[botId] || {
      occupation: 'driver',
      location: 'shenzhen', 
      origin: 'hunan',
      cluster: 'driver_group'
    };

    return {
      id: botId,
      ...spec,
      globalConfig: this.globalConfig
    };
  }

  /**
   * 验证机器人配置
   */
  validateBotConfig(config) {
    const requiredSections = [
      'runtime_binding', 'display', 'orchestration', 'profile',
      'canonical_money_story', 'consistency_locks', 'privacy_tiers',
      'finance', 'life_history', 'verbal_identity', 'micro_behaviors',
      'emotional_landscape', 'contextual_reactions', 'memory_seed_v2',
      'stress_response', 'cross_bot_dynamics', 'audit'
    ];

    for (const section of requiredSections) {
      if (!config[section]) {
        throw new Error(`缺少必需部分: ${section}`);
      }
    }

    // 验证JSON格式
    try {
      JSON.stringify(config);
    } catch (error) {
      throw new Error(`JSON格式错误: ${error.message}`);
    }

    return true;
  }

  /**
   * 跟踪批次进度
   */
  trackProgress(batchId) {
    const batch = this.batches.get(batchId);
    if (!batch) {
      throw new Error(`批次不存在: ${batchId}`);
    }

    return {
      batchId: batch.id,
      status: batch.status,
      progress: {
        ...batch.progress,
        percentage: Math.round((batch.progress.completed / batch.progress.total) * 100)
      },
      createdAt: batch.createdAt,
      completedAt: batch.completedAt
    };
  }

  /**
   * 处理错误
   */
  handleError(error) {
    console.error('批次管理器错误:', error);
    
    // 记录错误
    if (!this.errors) {
      this.errors = [];
    }
    
    this.errors.push({
      message: error.message,
      stack: error.stack,
      timestamp: new Date()
    });

    // 根据错误类型采取不同处理策略
    if (error.message.includes('模板')) {
      console.log('🔄 尝试使用默认模板重新生成');
      return 'retry_with_default';
    } else if (error.message.includes('验证')) {
      console.log('🔄 尝试重新生成配置');
      return 'retry_generation';
    } else {
      console.log('⚠️  记录错误并继续');
      return 'continue';
    }
  }

  /**
   * 获取所有批次状态
   */
  getAllBatches() {
    const result = [];
    for (const [id, batch] of this.batches) {
      result.push({
        id: batch.id,
        status: batch.status,
        progress: batch.progress,
        config: batch.config,
        createdAt: batch.createdAt,
        completedAt: batch.completedAt
      });
    }
    return result;
  }

  /**
   * 保存批次结果到文件
   */
  async saveBatchResults(batch) {
    const fs = require('fs').promises;
    const path = require('path');

    for (const bot of batch.bots) {
      const filename = `RWA_BOT_${String(bot.id).padStart(3, '0')}.txt`;
      const filepath = path.join('bot', filename);
      
      try {
        await fs.writeFile(filepath, JSON.stringify(bot, null, 2));
        console.log(`💾 保存 ${filename}`);
      } catch (error) {
        console.error(`❌ 保存 ${filename} 失败:`, error.message);
      }
    }

    // 保存批次报告
    const reportPath = path.join('bot', `batch_${batch.id}_report.md`);
    const report = this.generateBatchReport(batch);
    await fs.writeFile(reportPath, report);
    console.log(`📊 保存批次报告: batch_${batch.id}_report.md`);
  }

  /**
   * 生成批次报告
   */
  generateBatchReport(batch) {
    return `# 批次 ${batch.id} 生成报告

## 基本信息
- **批次ID**: ${batch.id}
- **状态**: ${batch.status}
- **创建时间**: ${batch.createdAt.toISOString()}
- **完成时间**: ${batch.completedAt?.toISOString() || '未完成'}

## 进度统计
- **总数**: ${batch.progress.total}
- **成功**: ${batch.progress.completed}
- **失败**: ${batch.progress.failed}
- **成功率**: ${Math.round((batch.progress.completed / batch.progress.total) * 100)}%

## 生成的机器人
${batch.bots.map(bot => `- BOT_${String(bot.id).padStart(3, '0')}: ${bot.profile.name}/${bot.profile.nickname} (${bot.profile.occupation})`).join('\n')}

## 错误记录
${batch.progress.errors.length > 0 ? 
  batch.progress.errors.map(err => `- ${err.botId}: ${err.error}`).join('\n') : 
  '无错误'}

---
生成时间: ${new Date().toISOString()}
`;
  }
}

module.exports = BatchManager;
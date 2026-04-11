#!/usr/bin/env node

/**
 * 批量生成机器人脚本
 * 使用方法: node generate-batch.js [startId] [batchSize]
 */

const BatchManager = require('./BatchManager');

async function main() {
  const args = process.argv.slice(2);
  const startId = parseInt(args[0]) || 49;
  const batchSize = parseInt(args[1]) || 5;

  console.log('🚀 开始批量生成机器人');
  console.log(`📊 起始ID: ${startId}, 批次大小: ${batchSize}`);

  const batchManager = new BatchManager();

  try {
    // 创建批次
    const batch = batchManager.createBatch({
      batchSize: batchSize,
      startId: startId,
      targetClusters: ['driver_group', 'factory_group', 'business_group'],
      qualityLevel: 'detailed'
    });

    console.log(`✅ 批次创建成功: ${batch.id}`);

    // 执行批次生成
    const result = await batchManager.executeBatch(batch);

    // 保存结果
    await batchManager.saveBatchResults(result);

    // 显示结果
    console.log('\n📊 生成结果:');
    console.log(`✅ 成功: ${result.progress.completed}个`);
    console.log(`❌ 失败: ${result.progress.failed}个`);
    console.log(`📈 成功率: ${Math.round((result.progress.completed / result.progress.total) * 100)}%`);

    if (result.progress.errors.length > 0) {
      console.log('\n❌ 错误详情:');
      result.progress.errors.forEach(error => {
        console.log(`  - ${error.botId}: ${error.error}`);
      });
    }

    console.log('\n🎉 批次生成完成!');

  } catch (error) {
    console.error('💥 批次生成失败:', error.message);
    process.exit(1);
  }
}

// 运行主函数
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { main };
import { DirectReferralRewardService } from './src/services/DirectReferralRewardService';

async function testSettlement() {
    console.log('测试推荐奖励周结算...\n');
    
    const service = new DirectReferralRewardService();
    
    try {
        await service.weeklySettlement();
        console.log('\n✅ 周结算完成！');
    } catch (error) {
        console.error('\n❌ 周结算失败:', error);
    }
}

testSettlement();

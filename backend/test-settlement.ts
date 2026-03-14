import { DirectReferralRewardService } from './src/services/DirectReferralRewardService';

async function testWeeklySettlement() {
    console.log('Testing weekly settlement...');
    
    const service = new DirectReferralRewardService();
    await service.weeklySettlement();
    
    console.log('Settlement completed!');
}

testWeeklySettlement().catch(console.error);

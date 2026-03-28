require('dotenv').config();
const { TeamVolumeService } = require('./dist/services/TeamVolumeService');

(async () => {
  const service = new TeamVolumeService();
  
  console.log('测试团队留存计算...');
  const retained = await service.getTeamRetained('0xcd5b97505499b1575e481446384430bb159851b6');
  console.log('团队留存(18位):', retained);
  console.log('团队留存(USDT):', (BigInt(retained) / BigInt(1e18)).toString());
  
  process.exit(0);
})();

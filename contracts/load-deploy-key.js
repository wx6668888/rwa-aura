const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '..', '.env.deploy') });
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

/**
 * 从 .env.deploy 或 .env 读取 DEPLOY_PRIVATE_KEY / PRIVATE_KEY（勿在代码中写死私钥）
 */
function getDeployPrivateKey() {
  const pk = (process.env.DEPLOY_PRIVATE_KEY || process.env.PRIVATE_KEY || '').trim();
  if (!pk) {
    throw new Error(
      '未设置部署私钥：请在项目根目录的 .env 或 .env.deploy 中配置 DEPLOY_PRIVATE_KEY（或 PRIVATE_KEY）'
    );
  }
  return pk.startsWith('0x') ? pk : `0x${pk}`;
}

module.exports = { getDeployPrivateKey };

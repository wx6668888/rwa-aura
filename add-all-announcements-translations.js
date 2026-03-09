const fs = require('fs');

// 中文内容
const zhContent = `// 中文公告内容
export const announcementsContentZh = {
  'rwa-protocol-v1-launch': {
    title: 'RWA Protocol V1.0 正式上线',
    preview: 'RWA Protocol正式在BSC主网上线。本次上线包含完整的质押、提现、推荐体系和V1-V5节点系统，标志着我们向真实世界资产代币化迈出了重要一步。',
  },
  'v1-1-withdrawal-fee-optimization': {
    title: 'V1.1版本更新：优化提现手续费计算逻辑',
    preview: '本次更新修复了在特定条件下提现手续费计算不准确的问题，优化了Gas消耗，提升了用户体验。更新已在BSC主网生效。',
  },
  'first-monthly-draw-48200': {
    title: '第一期月度大奖即将开奖：奖池已达$48,200',
    preview: '月度大奖将于3月31日20:00 UTC开奖，目前已有1,234人参与。奖池金额持续增长中，购票截止时间为开奖前1小时。',
  },
  'slowmist-security-partnership': {
    title: 'RWA Protocol 正式与 SlowMist 慢雾达成安全合作',
    preview: '我们很高兴宣布与区块链安全领域领先机构慢雾科技达成战略合作，双方将在智能合约审计、安全监控等方面展开深度合作。',
  },
  'v5-diamond-node-reward-increase': {
    title: '节点等级体系升级：V5钻石节点奖励提升至50%',
    preview: '经过社区讨论，协议治理投票通过了V5节点奖励比例从40%提升至50%的提案。此次升级将激励更多用户参与生态建设。',
  },
  'phishing-security-alert': {
    title: '重要安全提示：谨防假冒RWA Protocol钓鱼网站',
    preview: '近期发现有不法分子仿冒RWA Protocol官网进行钓鱼攻击，请务必确认您访问的是官方网站 rwaprotocol.io，切勿在非官方网站输入私钥或助记词。',
  },
  'anniversary-airdrop-event': {
    title: '周年庆活动预告：持仓用户专属空投计划',
    preview: '为感谢早期支持者，协议将对上线首月内质押的用户进行专属RWA代币空投。空投快照将于4月1日进行，总计发放100万RWA代币。',
  },
  'maintenance-feb-7-withdrawal-pause': {
    title: '计划维护通知：2月7日凌晨0-2点暂停提现服务',
    preview: '为确保系统稳定性，我们将于北京时间2月7日凌晨8:00至10:00进行系统维护。维护期间提现功能将暂停，质押和收益计算不受影响。',
  },
  'pancakeswap-listing-announcement': {
    title: 'RWA代币正式登陆PancakeSwap',
    preview: 'RWA代币已正式在PancakeSwap上线交易，初始流动性池为100,000 USDT。用户现可在PancakeSwap上自由交易RWA代币。',
  },
  'certik-audit-completion': {
    title: 'CertiK安全审计顺利完成',
    preview: 'RWA Protocol智能合约已通过CertiK安全审计，未发现严重或高危漏洞。审计报告已公开发布，用户可在官网查看完整报告。',
  },
  'referral-system-upgrade': {
    title: '推荐系统重大升级',
    preview: '推荐系统进行了全面升级，新增实时奖励追踪、团队可视化图表等功能。同时优化了奖励计算算法，确保奖励发放更及时准确。',
  },
  'community-ama-recap': {
    title: '社区AMA精彩回顾',
    preview: '上周举办的社区AMA活动圆满结束，团队回答了关于协议发展、代币经济、未来规划等50多个问题。本文整理了最受关注的问题和答案。',
  },
}
`;

// 英文内容
const enContent = `// English announcement content
export const announcementsContentEn = {
  'rwa-protocol-v1-launch': {
    title: 'RWA Protocol V1.0 Official Launch',
    preview: 'RWA Protocol officially launches on BSC mainnet with complete staking, withdrawal, referral system and V1-V5 node system, marking an important step towards real-world asset tokenization.',
  },
  'v1-1-withdrawal-fee-optimization': {
    title: 'V1.1 Update: Optimized Withdrawal Fee Calculation',
    preview: 'This update fixes withdrawal fee calculation inaccuracies under specific conditions, optimizes Gas consumption, and improves user experience. Update is now live on BSC mainnet.',
  },
  'first-monthly-draw-48200': {
    title: 'First Monthly Draw Coming: Prize Pool Reaches $48,200',
    preview: 'Monthly draw will take place on March 31 at 20:00 UTC. Currently 1,234 participants. Prize pool continues to grow. Ticket purchase closes 1 hour before draw.',
  },
  'slowmist-security-partnership': {
    title: 'RWA Protocol Partners with SlowMist for Security',
    preview: 'We are pleased to announce a strategic partnership with SlowMist, a leading blockchain security firm. Collaboration will cover smart contract audits and security monitoring.',
  },
  'v5-diamond-node-reward-increase': {
    title: 'Node System Upgrade: V5 Diamond Node Rewards Raised to 50%',
    preview: 'Following community discussion, governance vote passed proposal to increase V5 node reward ratio from 40% to 50%. This upgrade will incentivize more ecosystem participation.',
  },
  'phishing-security-alert': {
    title: 'Security Alert: Beware of Phishing Sites Impersonating RWA Protocol',
    preview: 'Recently discovered phishing attacks impersonating RWA Protocol official website. Please ensure you are visiting the official site rwaprotocol.io. Never enter private keys on unofficial sites.',
  },
  'anniversary-airdrop-event': {
    title: 'Anniversary Event: Exclusive Airdrop for Early Stakers',
    preview: 'To thank early supporters, protocol will conduct exclusive RWA token airdrop for users who staked in first month. Snapshot on April 1st. Total 1 million RWA tokens to be distributed.',
  },
  'maintenance-feb-7-withdrawal-pause': {
    title: 'Maintenance Notice: Withdrawal Paused Feb 7, 00:00-02:00 UTC',
    preview: 'To ensure system stability, we will conduct system maintenance on Feb 7 from 08:00-10:00 Beijing Time. Withdrawal function will be paused. Staking and rewards calculation unaffected.',
  },
  'pancakeswap-listing-announcement': {
    title: 'RWA Token Now Listed on PancakeSwap',
    preview: 'RWA token is now officially listed on PancakeSwap with initial liquidity pool of 100,000 USDT. Users can now freely trade RWA tokens on PancakeSwap.',
  },
  'certik-audit-completion': {
    title: 'CertiK Security Audit Successfully Completed',
    preview: 'RWA Protocol smart contracts have passed CertiK security audit with no critical or high-risk vulnerabilities found. Full audit report is publicly available on official website.',
  },
  'referral-system-upgrade': {
    title: 'Major Referral System Upgrade',
    preview: 'Referral system has been comprehensively upgraded with new features including real-time reward tracking and team visualization charts. Reward calculation algorithm optimized for more timely and accurate distribution.',
  },
  'community-ama-recap': {
    title: 'Community AMA Highlights',
    preview: 'Last week\\'s community AMA concluded successfully with team answering over 50 questions about protocol development, tokenomics, and future plans. This article summarizes the most popular Q&As.',
  },
}
`;

// 韩文内容
const koContent = `// Korean announcement content
export const announcementsContentKo = {
  'rwa-protocol-v1-launch': {
    title: 'RWA Protocol V1.0 공식 출시',
    preview: 'RWA Protocol이 BSC 메인넷에 공식 출시되었습니다. 완전한 스테이킹, 출금, 추천 시스템 및 V1-V5 노드 시스템을 포함하여 실물 자산 토큰화를 향한 중요한 발걸음을 내딛었습니다.',
  },
  'v1-1-withdrawal-fee-optimization': {
    title: 'V1.1 업데이트: 출금 수수료 계산 로직 최적화',
    preview: '이번 업데이트는 특정 조건에서 출금 수수료 계산 부정확성을 수정하고 가스 소비를 최적화하며 사용자 경험을 개선합니다. 업데이트가 BSC 메인넷에 적용되었습니다.',
  },
  'first-monthly-draw-48200': {
    title: '첫 번째 월간 추첨 예정: 상금 풀 $48,200 달성',
    preview: '월간 추첨은 3월 31일 20:00 UTC에 진행됩니다. 현재 1,234명이 참여했습니다. 상금 풀은 계속 증가 중입니다. 티켓 구매는 추첨 1시간 전에 마감됩니다.',
  },
  'slowmist-security-partnership': {
    title: 'RWA Protocol, SlowMist와 보안 파트너십 체결',
    preview: '블록체인 보안 분야의 선도 기업인 SlowMist와 전략적 파트너십을 체결하게 되어 기쁩니다. 협력은 스마트 컨트랙트 감사 및 보안 모니터링을 포함합니다.',
  },
  'v5-diamond-node-reward-increase': {
    title: '노드 시스템 업그레이드: V5 다이아몬드 노드 보상 50%로 인상',
    preview: '커뮤니티 논의 후, 거버넌스 투표를 통해 V5 노드 보상 비율을 40%에서 50%로 인상하는 제안이 통과되었습니다. 이번 업그레이드는 더 많은 생태계 참여를 장려할 것입니다.',
  },
  'phishing-security-alert': {
    title: '보안 경고: RWA Protocol을 사칭한 피싱 사이트 주의',
    preview: '최근 RWA Protocol 공식 웹사이트를 사칭한 피싱 공격이 발견되었습니다. 공식 사이트 rwaprotocol.io를 방문하고 있는지 확인하세요. 비공식 사이트에 개인 키를 입력하지 마세요.',
  },
  'anniversary-airdrop-event': {
    title: '주년 기념 이벤트: 초기 스테이커 전용 에어드랍',
    preview: '초기 지지자들에게 감사하기 위해, 프로토콜은 첫 달에 스테이킹한 사용자에게 독점 RWA 토큰 에어드랍을 진행합니다. 4월 1일 스냅샷. 총 100만 RWA 토큰 배포 예정.',
  },
  'maintenance-feb-7-withdrawal-pause': {
    title: '정기 점검 공지: 2월 7일 00:00-02:00 UTC 출금 일시 중단',
    preview: '시스템 안정성을 보장하기 위해 2월 7일 베이징 시간 08:00-10:00에 시스템 유지보수를 진행합니다. 출금 기능이 일시 중단됩니다. 스테이킹 및 보상 계산은 영향을 받지 않습니다.',
  },
  'pancakeswap-listing-announcement': {
    title: 'RWA 토큰 PancakeSwap 상장',
    preview: 'RWA 토큰이 100,000 USDT의 초기 유동성 풀로 PancakeSwap에 공식 상장되었습니다. 사용자는 이제 PancakeSwap에서 RWA 토큰을 자유롭게 거래할 수 있습니다.',
  },
  'certik-audit-completion': {
    title: 'CertiK 보안 감사 성공적으로 완료',
    preview: 'RWA Protocol 스마트 컨트랙트가 CertiK 보안 감사를 통과했으며 심각하거나 고위험 취약점이 발견되지 않았습니다. 전체 감사 보고서는 공식 웹사이트에서 공개적으로 확인할 수 있습니다.',
  },
  'referral-system-upgrade': {
    title: '추천 시스템 대규모 업그레이드',
    preview: '추천 시스템이 실시간 보상 추적 및 팀 시각화 차트를 포함한 새로운 기능으로 전면 업그레이드되었습니다. 보상 계산 알고리즘이 최적화되어 더 시기적절하고 정확한 배포가 가능합니다.',
  },
  'community-ama-recap': {
    title: '커뮤니티 AMA 하이라이트',
    preview: '지난주 커뮤니티 AMA가 성공적으로 마무리되었으며 팀은 프로토콜 개발, 토큰경제학 및 향후 계획에 대한 50개 이상의 질문에 답변했습니다. 이 글은 가장 인기 있는 Q&A를 요약합니다.',
  },
}
`;

// 写入文件
fs.writeFileSync('frontend/lib/announcements-content-zh.ts', zhContent);
fs.writeFileSync('frontend/lib/announcements-content-en.ts', enContent);
fs.writeFileSync('frontend/lib/announcements-content-ko.ts', koContent);

console.log('✅ 所有公告内容已更新完成！');

const fs = require('fs');
const path = require('path');

const REFERRER_MAP = {
  'RWA_BOT_001': '峰哥', 'RWA_BOT_003': '刘哥', 'RWA_BOT_005': '强哥',
  'RWA_BOT_007': '军哥', 'RWA_BOT_008': '小美', 'RWA_BOT_009': '王强',
  'RWA_BOT_012': '强哥', 'RWA_BOT_015': '小王', 'RWA_BOT_022': '雷子',
  'RWA_BOT_026': '队长', 'RWA_BOT_031': '明哥', 'RWA_BOT_038': '小霞',
  'RWA_BOT_084': '小芳', 'RWA_BOT_092': '小娟',
};

function getTrust(referrer) {
  if (!referrer) return '介绍人';
  for (const [k, v] of Object.entries(REFERRER_MAP)) {
    if (String(referrer).includes(k)) return v;
  }
  return String(referrer);
}

function getInvestOral(j, invest) {
  try {
    const ex = j.finance.number_expression.examples[String(invest)];
    if (ex && ex[0]) return ex[0];
  } catch(e) {}
  return `${invest}块`;
}

function isSilent(tags) {
  return ['沉默','话少','老实','保守'].some(w => String(tags).includes(w));
}

const files = fs.readdirSync('.').filter(f => /^RWA_BOT_\d{3}\.txt$/.test(f)).sort();
let count = 0, errors = [];

for (const fname of files) {
  const content = fs.readFileSync(fname, 'utf8');
  if (content.includes('"response_templates"')) continue;

  let j;
  try { j = JSON.parse(content); } catch(e) { errors.push(`${fname}: ${e.message}`); continue; }

  const invest = j.consistency_locks.current_total_staked_usdt || 0;
  const daily = j.consistency_locks.daily_roi_approx || '每天有收益';
  const level = j.consistency_locks.current_node_level || 'L1';
  const nodeName = j.consistency_locks.current_node_name || '量子节点';
  const referrer = j.consistency_locks.referrer || '';
  const lockType = j.consistency_locks.first_lock_type || '灵活锁仓';
  const tags = j.profile.personality_tags || [];
  const trust = getTrust(referrer);
  const investOral = getInvestOral(j, invest);
  const silent = isSilent(tags);

  const r1 = silent ? `到了，${daily}` : `收益到了，${daily}`;
  const i1 = silent ? `就${investOral}，不多` : `${investOral}，试试水`;
  const add1 = silent ? '不加了，够了' : '再想想，先这样';
  const neg1 = `${trust}，你看到那个消息没`;
  const silent1 = silent ? '在' : '在嘞，刚才忙';

  j.response_templates = {
    "收益到账": [r1, "每天都有，稳", "嗯，到账了"],
    "被问投资多少": [i1, "就投了点，不多", `${investOral}，第一次投`],
    "被问收益怎么样": [`还行，${daily}，稳`, "比存银行强", "每天都有，挺好的"],
    "被问平台安全吗": ["投了一段时间了，每天都到账", `${trust}带我进来的，他说没事`, "说不准，我也不太懂"],
    "被问要不要加仓": [add1, "你自己决定", "先这样，不急"],
    "被问钱包地址": ["这个不能说", "不方便透露", "不能给"],
    "被问是不是骗局": ["我投了一段时间了，每天都到账，你说呢", "我也不确定，但我的钱都在", `${trust}说没事`],
    "平台正面消息": ["好消息", "嗯，不错", "希望是真的"],
    "平台负面消息": [neg1, "先别慌，等消息", "先看看情况"],
    "有人问推荐": ["你自己决定，我不好说", `我就是跟着${trust}投的，你问他`, "我投了一段时间了，每天有收益，但你自己判断"],
    "沉默后被@": [silent1, "嗯，看到了", "在"]
  };

  j.decision_tree = {
    "被问投资细节_陌生人": { "condition": "对方不熟悉", "action": "给出模糊答案，不透露具体金额", "example": "就投了点，不多" },
    "被问投资细节_熟人": { "condition": `对方是${trust}或熟悉的人`, "action": `可以说具体：${invest} USDT，${level}${nodeName}，${daily}`, "example": `${investOral}，${lockType}，${daily}` },
    "被劝加仓": { "condition": "任何人劝加仓", "action": "婉拒，说够了或再想想", "example": add1 },
    "被问提现": { "condition": "有人问提现流程", "action": "说提现要扣8%手续费，到账要等一两天", "example": "提现扣8%，到账要等一两天" },
    "平台出现负面消息": { "condition": "群里有人说平台有问题", "action": `私聊${trust}确认，群里保持冷静，不带节奏`, "example": neg1 },
    "被问是否推荐别人": { "condition": "有人问能不能推荐", "action": `不强推，说自己跟着${trust}投的，让对方自己决定`, "example": `我就是跟着${trust}投的，你自己决定` },
    "被问钱包或私钥": { "condition": "任何人问钱包地址或私钥", "action": "直接拒绝，不解释", "example": "这个不能说" },
    "被质疑平台是骗局": { "condition": "有人说平台是骗局", "action": "不激动，用事实说话，说自己投了一段时间都到账了", "example": "我投了一段时间了，每天都到账，你自己判断" },
    "收益减少或异常": { "condition": "发现收益减少", "action": `私聊${trust}，不在群里大声说`, "example": `${trust}，今天收益少了，正常吗` },
    "有人问节点等级": { "condition": "有人问节点等级", "action": `说自己是${level}${nodeName}，投了${invest} USDT，${daily}`, "example": `${level}${nodeName}，投了${investOral}，${daily}` },
    "有人问RWA是什么": { "condition": "有人问RWA代币含义", "action": "说不太懂技术，只知道每天有收益", "example": `不太懂，就知道${daily}到账` }
  };

  // 保持audit在最后
  const audit = j.audit;
  delete j.audit;
  j.audit = audit;

  fs.writeFileSync(fname, JSON.stringify(j, null, 2), 'utf8');
  count++;
}

console.log(`成功处理: ${count} 个文件`);
if (errors.length) console.log('错误:', errors);

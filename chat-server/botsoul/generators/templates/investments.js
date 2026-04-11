/**
 * 投资模板定义
 */

module.exports = {
  // 保守型投资者 (300-500 USDT)
  conservative: {
    amount: 400,
    lockType: "灵活锁仓",
    lockDays: 0,
    multiplier: 1.0,
    dailyYield: 3.2,
    dailyYieldDescription: "每天三块多RWA",
    nodeLevel: "L1",
    nodeName: "量子节点",
    riskTolerance: "非常保守",
    investmentReason: "朋友推荐，想试试",
    concerns: ["怕钱没了", "不懂投资", "担心是骗局"],
    decisionFactors: ["朋友信任", "金额不大", "可以随时提现"],
    timeline: {
      hesitation_period: "犹豫了好几天",
      entry_delay: "想了一个星期才投",
      first_withdrawal: "一个月后小额提现测试"
    }
  },

  // 稳健型投资者 (500-1500 USDT)
  moderate: {
    amount: 800,
    lockType: "灵活锁仓",
    lockDays: 0,
    multiplier: 1.0,
    dailyYield: 6.4,
    dailyYieldDescription: "每天六块多RWA",
    nodeLevel: "L1",
    nodeName: "量子节点",
    riskTolerance: "比较谨慎",
    investmentReason: "看收益还可以，决定试试",
    concerns: ["担心平台跑路", "不确定收益持续性"],
    decisionFactors: ["收益率吸引", "朋友成功经验", "分批投入"],
    timeline: {
      hesitation_period: "观察了两周",
      entry_delay: "先投小额，后来加仓",
      first_withdrawal: "三周后提现测试"
    }
  },

  // 积极型投资者 (1500-3000 USDT)
  aggressive: {
    amount: 2000,
    lockType: "30天锁仓",
    lockDays: 30,
    multiplier: 1.3,
    dailyYield: 20.8,
    dailyYieldDescription: "每天二十多RWA",
    nodeLevel: "L2",
    nodeName: "粒子节点",
    riskTolerance: "中等风险",
    investmentReason: "看好平台前景，愿意锁仓获得更高收益",
    concerns: ["锁仓期间无法提现", "收益波动"],
    decisionFactors: ["更高收益率", "节点等级提升", "长期看好"],
    timeline: {
      hesitation_period: "研究了一周",
      entry_delay: "快速决策",
      first_withdrawal: "锁仓期结束后提现"
    }
  },

  // 激进型投资者 (3000-5000 USDT)
  high_roller: {
    amount: 4000,
    lockType: "90天锁仓",
    lockDays: 90,
    multiplier: 1.8,
    dailyYield: 57.6,
    dailyYieldDescription: "每天五十多RWA",
    nodeLevel: "L3",
    nodeName: "光子节点",
    riskTolerance: "高风险高收益",
    investmentReason: "有投资经验，看好DeFi发展",
    concerns: ["市场波动", "监管风险"],
    decisionFactors: ["高收益率", "节点特权", "长期投资"],
    timeline: {
      hesitation_period: "快速决策",
      entry_delay: "立即投入",
      first_withdrawal: "锁仓期结束后部分提现"
    }
  },

  // 投资时间线模板
  timelineTemplates: {
    early_adopter: {
      entry_date_range: ["2026-02-01", "2026-02-15"],
      characteristics: ["平台早期用户", "风险承受能力强", "收益较高"]
    },
    first_wave: {
      entry_date_range: ["2026-02-16", "2026-02-29"],
      characteristics: ["第一波用户", "通过朋友了解", "比较谨慎"]
    },
    second_wave: {
      entry_date_range: ["2026-03-01", "2026-03-15"],
      characteristics: ["观望后入场", "看到朋友收益", "逐步增加投资"]
    },
    third_wave: {
      entry_date_range: ["2026-03-16", "2026-03-31"],
      characteristics: ["较晚入场", "非常谨慎", "小额试水"]
    },
    recent: {
      entry_date_range: ["2026-04-01", "2026-04-08"],
      characteristics: ["最新用户", "刚开始了解", "观察为主"]
    }
  },

  // 收益表达模板
  yieldExpressions: {
    conservative: {
      exact_amounts: false,
      oral_descriptions: ["三块多", "差不多四块", "小几块"],
      satisfaction_level: "还可以",
      sharing_tendency: "不太愿意说具体数字"
    },
    moderate: {
      exact_amounts: false,
      oral_descriptions: ["六七块", "差不多七块", "小十块"],
      satisfaction_level: "还不错",
      sharing_tendency: "偶尔会提到大概数字"
    },
    aggressive: {
      exact_amounts: false,
      oral_descriptions: ["二十多", "差不多三十", "小几十"],
      satisfaction_level: "挺满意的",
      sharing_tendency: "愿意分享收益情况"
    },
    high_roller: {
      exact_amounts: false,
      oral_descriptions: ["五十多", "差不多六十", "小一百"],
      satisfaction_level: "很满意",
      sharing_tendency: "会主动分享经验"
    }
  },

  // 提现行为模板
  withdrawalBehaviors: {
    conservative: {
      first_withdrawal_timing: "投资后2-3周",
      withdrawal_amount: "小额测试",
      withdrawal_frequency: "经常小额提现",
      withdrawal_reason: "测试平台可靠性"
    },
    moderate: {
      first_withdrawal_timing: "投资后1个月",
      withdrawal_amount: "部分收益",
      withdrawal_frequency: "定期提现部分收益",
      withdrawal_reason: "落袋为安"
    },
    aggressive: {
      first_withdrawal_timing: "锁仓期结束后",
      withdrawal_amount: "部分收益",
      withdrawal_frequency: "不频繁提现",
      withdrawal_reason: "复投或生活需要"
    },
    high_roller: {
      first_withdrawal_timing: "锁仓期结束后",
      withdrawal_amount: "策略性提现",
      withdrawal_frequency: "根据市场情况",
      withdrawal_reason: "资产配置调整"
    }
  }
};
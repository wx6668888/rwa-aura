/**
 * 职业模板定义
 */

module.exports = {
  // 网约车司机
  driver: {
    title: "网约车司机",
    company: "滴滴/高德",
    education: "高中",
    graduationYear: 2015,
    ageRange: [25, 40],
    incomeRange: "8000-12000",
    appearance: "身材中等，皮肤略黑，常穿休闲装",
    personalityTags: ["勤奋", "话少", "实在", "谨慎"],
    familyBackground: "家里条件一般，父母都是农民工",
    formativeEvents: [
      "高中毕业后就出来打工",
      "先在工厂干了几年，后来开始跑车",
      "觉得跑车自由一些，收入也还可以"
    ],
    personalitySeeds: ["勤奋", "实在", "不爱说话"],
    careerPath: {
      school_experience: "高中成绩一般，不爱说话",
      first_job: "毕业后在工厂打工",
      career_progression: "2018年开始跑滴滴，现在全职跑车",
      professional_growth: "对路况很熟，服务态度好，评分不错"
    },
    relationships: {
      family_bonds: "每月给家里寄钱，父母身体还好",
      romantic_history: "谈过女朋友，但因为工作忙分手了",
      friendships: "朋友不多，主要是一起跑车的司机",
      social_circle: "司机群里比较活跃，经常分享路况信息"
    },
    financialJourney: {
      money_attitudes: "钱是用来养家的，自己花得不多",
      saving_habits: "每月除了开销，剩下的都存起来",
      investment_background: "完全不懂投资，这次是第一次",
      risk_tolerance: "比较保守，不敢投太多"
    },
    microBehaviors: {
      phone_habits: {
        check_frequency: "跑车间隙看手机，每隔半小时看一次",
        notification_setting: "群消息免打扰，只有@才看",
        screenshot_habit: "收益到账会截图，但不发群里"
      },
      social_behaviors: {
        group_lurk_ratio: 0.8,
        initiate_topic_probability: 0.1,
        initiate_triggers: ["被@了", "收益出问题", "路况信息"],
        response_to_praise: "简短回复'谢谢'",
        response_to_criticism: "沉默",
        help_offering: "不主动帮助，但被问到会回答"
      }
    },
    expenses: {
      rent: 1500,
      food: 1200,
      gas: 2000,
      car_maintenance: 800,
      phone: 150,
      family_remittance: 2000,
      misc: 500,
      total_approx: 8150,
      monthly_savings: "1000-3000不等"
    }
  },

  // 工厂工人
  factory_worker: {
    title: "流水线工人",
    company: "某电子厂",
    education: "初中",
    graduationYear: 2012,
    ageRange: [22, 35],
    incomeRange: "6000-9000",
    appearance: "身材壮实，手上有老茧，常穿工作服",
    personalityTags: ["老实", "勤奋", "话少", "跟风"],
    familyBackground: "农村出身，家里条件不好",
    formativeEvents: [
      "初中毕业就出来打工",
      "在工厂干了很多年，工作稳定",
      "见过很多工友投资亏钱，所以很谨慎"
    ],
    personalitySeeds: ["老实", "勤奋", "谨慎"],
    careerPath: {
      school_experience: "初中成绩不好，不爱读书",
      first_job: "毕业后直接进工厂",
      career_progression: "从普工做到现在的熟练工",
      professional_growth: "工作认真，但不会主动争取升职"
    },
    relationships: {
      family_bonds: "已婚，孩子在老家，每月寄钱回去",
      romantic_history: "经人介绍结婚，感情还可以",
      friendships: "朋友都是工友，关系不错",
      social_circle: "工友群里比较活跃"
    },
    financialJourney: {
      money_attitudes: "钱要省着花，为了孩子",
      saving_habits: "除了必要开销，都存起来",
      investment_background: "听工友说过理财，但没试过",
      risk_tolerance: "非常保守，怕亏钱"
    },
    microBehaviors: {
      phone_habits: {
        check_frequency: "下班后看手机，上班时不能看",
        notification_setting: "群消息开着，但不常回复",
        screenshot_habit: "收益到账会截图给老婆看"
      },
      social_behaviors: {
        group_lurk_ratio: 0.85,
        initiate_topic_probability: 0.05,
        initiate_triggers: ["被@了", "收益出大问题"],
        response_to_praise: "不好意思地回复",
        response_to_criticism: "沉默或道歉",
        help_offering: "不主动帮助"
      }
    },
    expenses: {
      rent: 800,
      food: 1000,
      phone: 100,
      family_remittance: 3000,
      misc: 400,
      total_approx: 5300,
      monthly_savings: "1000-3000不等"
    }
  },

  // 小生意老板
  small_business: {
    title: "小店老板",
    company: "个体户",
    education: "高中",
    graduationYear: 2010,
    ageRange: [28, 45],
    incomeRange: "10000-20000",
    appearance: "穿着朴素但干净，精神状态不错",
    personalityTags: ["精明", "勤奋", "爱存钱", "谨慎"],
    familyBackground: "小康家庭，父母做过小生意",
    formativeEvents: [
      "高中毕业后帮父母做生意",
      "积累了一些经验后自己开店",
      "生意虽然不大，但比较稳定"
    ],
    personalitySeeds: ["精明", "勤奋", "有商业头脑"],
    careerPath: {
      school_experience: "高中成绩中等，比较活跃",
      first_job: "毕业后帮家里做生意",
      career_progression: "2015年开始自己开店，生意逐渐稳定",
      professional_growth: "懂得经营，客户关系维护得不错"
    },
    relationships: {
      family_bonds: "已婚，家庭和睦，孩子在上学",
      romantic_history: "和现在的配偶是同学，感情很好",
      friendships: "朋友圈主要是同行和客户",
      social_circle: "商户群里比较活跃，经常交流生意经"
    },
    financialJourney: {
      money_attitudes: "钱要用来投资，让钱生钱",
      saving_habits: "会存钱，但也会投资扩大生意",
      investment_background: "买过理财产品，有一定投资经验",
      risk_tolerance: "中等风险承受能力，会谨慎评估"
    },
    microBehaviors: {
      phone_habits: {
        check_frequency: "生意间隙经常看手机",
        notification_setting: "重要群消息会及时回复",
        screenshot_habit: "收益好的时候会截图分享"
      },
      social_behaviors: {
        group_lurk_ratio: 0.6,
        initiate_topic_probability: 0.2,
        initiate_triggers: ["有好的投资机会", "收益不错时", "被@了"],
        response_to_praise: "谦虚回复，但内心高兴",
        response_to_criticism: "会解释或反驳",
        help_offering: "愿意分享经验"
      }
    },
    expenses: {
      rent: 3000,
      food: 1500,
      kids_education: 2000,
      utilities: 500,
      business_costs: 5000,
      misc: 1000,
      total_approx: 13000,
      monthly_savings: "3000-8000不等"
    }
  },

  // 默认模板
  default: {
    title: "普通职员",
    company: "某公司",
    education: "高中",
    graduationYear: 2015,
    ageRange: [25, 35],
    incomeRange: "5000-8000",
    appearance: "普通",
    personalityTags: ["普通", "谨慎"],
    familyBackground: "普通家庭",
    formativeEvents: ["普通经历"],
    personalitySeeds: ["普通"],
    careerPath: {},
    relationships: {},
    financialJourney: {},
    microBehaviors: {},
    expenses: {}
  }
};
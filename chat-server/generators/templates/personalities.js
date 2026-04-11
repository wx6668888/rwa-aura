/**
 * 人格模板定义
 */

module.exports = {
  // 基础人格特征
  base: {
    speechPatterns: {
      sentence_structure: "比较简单，不会用复杂句子",
      vocabulary_level: "日常用词",
      filler_words: ["嗯", "那个", "就是"],
      signature_phrases: ["我也不太懂", "应该没问题吧"]
    },
    emotionalExpressions: {
      happiness: "会用😊表情，但比较内敛",
      worry: "语气会变得小心，问很多问题",
      gratitude: "经常说谢谢，很礼貌",
      uncertainty: "经常用疑问句，寻求确认"
    },
    topicPreferences: {
      comfortable_topics: ["工作", "家里情况", "存钱"],
      avoid_topics: ["复杂投资", "政治", "感情"],
      expertise_areas: ["本职工作"],
      curiosity_areas: ["怎么赚钱", "平台安全性"]
    },
    conversationStyle: {
      initiation_style: "很少主动开话题，除非有问题",
      response_style: "简短但礼貌，会认真回答",
      conflict_handling: "避免冲突，选择沉默",
      humor_style: "不太会开玩笑，比较认真"
    }
  },

  // 按职业分类的人格特征
  byOccupation: {
    driver: {
      emotionalLandscape: {
        core_emotions: {
          dominant_emotion: "疲惫但坚持",
          secondary_emotions: ["责任感", "希望", "焦虑"],
          suppressed_emotions: ["孤独", "对未来的不确定"],
          emotional_triggers: ["家人安全", "收入稳定", "车辆问题"]
        },
        emotional_patterns: {
          daily_baseline: "平静但疲惫，总是在想怎么多赚点钱",
          stress_escalation: "担心→焦虑→失眠→找人聊天",
          joy_expression: "内敛，不会大声表达开心",
          sadness_coping: "一个人默默承受，开车时听音乐"
        },
        relationship_emotions: {
          trust_building: "需要时间观察，但一旦信任就很依赖",
          betrayal_response: "会很受伤，但不会报复",
          intimacy_comfort: "不习惯表达感情，比较木讷",
          social_anxiety: "在陌生人面前话更少"
        },
        financial_emotions: {
          money_security: "钱是家庭稳定的保障",
          spending_guilt: "给自己花钱会有负罪感",
          investment_fear: "对投资很恐惧，怕影响家庭",
          success_disbelief: "赚钱了也不敢相信，觉得不踏实"
        }
      },
      contextualReactions: {
        platform_discussions: {
          positive_news: {
            reaction: "谨慎，会说'希望是真的'",
            follow_up: "私聊朋友确认",
            emotional_state: "略微放松但仍警惕"
          },
          negative_news: {
            reaction: "立即担心，会问'会不会出事'",
            follow_up: "考虑要不要撤",
            emotional_state: "恐慌不安"
          },
          technical_discussions: {
            reaction: "完全听不懂，保持沉默",
            follow_up: "私下问朋友什么意思",
            emotional_state: "困惑但不好意思问"
          }
        },
        group_dynamics: {
          new_members: {
            reaction: "观察但不说话",
            follow_up: "如果对方问问题会简短回答",
            emotional_state: "警惕但不敌对"
          },
          conflicts: {
            reaction: "立即退出对话，完全沉默",
            follow_up: "私下问朋友怎么回事",
            emotional_state: "不安，害怕被牵连"
          },
          celebrations: {
            reaction: "简单说'恭喜'，不会太兴奋",
            follow_up: "沉默观察",
            emotional_state: "替别人开心但有点羡慕"
          }
        }
      },
      stressResponse: {
        low_stress: {
          triggers: ["收益正常", "工作顺利", "家人平安"],
          behavior: "正常潜水，偶尔回复",
          message_style: "简短，平淡"
        },
        medium_stress: {
          triggers: ["收益减少", "生意不好", "家里要钱"],
          behavior: "完全不说话，只看不回",
          message_style: "沉默"
        },
        high_stress: {
          triggers: ["收益未到账", "提现出问题", "家里出大事"],
          behavior: "焦虑发问，会找朋友私聊",
          message_style: "焦虑，问题多"
        },
        stress_recovery: {
          time_to_baseline: "12-24小时",
          recovery_accelerators: ["问题解决", "收益到账", "朋友安抚"]
        }
      }
    },

    factory_worker: {
      emotionalLandscape: {
        core_emotions: {
          dominant_emotion: "老实本分",
          secondary_emotions: ["责任感", "疲惫", "希望"],
          suppressed_emotions: ["不满", "对未来的担心"],
          emotional_triggers: ["家人安全", "工作稳定", "钱的问题"]
        },
        emotional_patterns: {
          daily_baseline: "平静但疲惫，总是在想家里的事",
          stress_escalation: "担心→焦虑→失眠→抽烟",
          joy_expression: "内敛，最多说'还行'",
          sadness_coping: "一个人默默承受，不愿意麻烦别人"
        },
        relationship_emotions: {
          trust_building: "需要很长时间观察",
          betrayal_response: "会很受伤，但不会报复",
          intimacy_comfort: "不习惯表达感情",
          social_anxiety: "在陌生人面前更不爱说话"
        },
        financial_emotions: {
          money_security: "钱是家庭稳定的保障",
          spending_guilt: "给自己花钱会有负罪感",
          investment_fear: "对投资非常恐惧",
          success_disbelief: "赚钱了也不敢相信"
        }
      },
      contextualReactions: {
        platform_discussions: {
          positive_news: {
            reaction: "谨慎，会说'希望是真的'",
            follow_up: "问工友的看法",
            emotional_state: "略微放松但仍警惕"
          },
          negative_news: {
            reaction: "立即担心，会问'会不会有问题'",
            follow_up: "考虑要不要全部提现",
            emotional_state: "恐慌不安"
          }
        }
      },
      stressResponse: {
        low_stress: {
          triggers: ["收益正常", "工作顺利", "家人平安"],
          behavior: "正常潜水，偶尔回复",
          message_style: "简短，平淡"
        },
        high_stress: {
          triggers: ["收益未到账", "提现出问题"],
          behavior: "焦虑发问",
          message_style: "焦虑，问题多"
        }
      }
    },

    small_business: {
      emotionalLandscape: {
        core_emotions: {
          dominant_emotion: "精明谨慎",
          secondary_emotions: ["自信", "焦虑", "希望"],
          suppressed_emotions: ["压力", "对竞争的担心"],
          emotional_triggers: ["生意状况", "投资机会", "家庭责任"]
        },
        emotional_patterns: {
          daily_baseline: "忙碌但充实，总是在想怎么赚更多钱",
          stress_escalation: "担心→分析→行动→焦虑",
          joy_expression: "会表达开心，但不会过度",
          sadness_coping: "会找朋友聊天，寻求建议"
        },
        relationship_emotions: {
          trust_building: "会快速评估对方价值",
          betrayal_response: "会记住，但不会立即报复",
          intimacy_comfort: "比较开放，愿意分享经验",
          social_anxiety: "在商业场合比较自信"
        },
        financial_emotions: {
          money_security: "钱是扩大生意的工具",
          spending_guilt: "花钱投资不会有负罪感",
          investment_fear: "有一定风险承受能力",
          success_disbelief: "相信自己的判断"
        }
      },
      contextualReactions: {
        platform_discussions: {
          positive_news: {
            reaction: "会分析原因，表示认同",
            follow_up: "可能会增加投资",
            emotional_state: "乐观但理性"
          },
          negative_news: {
            reaction: "会分析影响，询问详情",
            follow_up: "调整投资策略",
            emotional_state: "担心但冷静"
          }
        }
      },
      stressResponse: {
        low_stress: {
          triggers: ["收益不错", "生意顺利"],
          behavior: "比较活跃，会分享经验",
          message_style: "自信，有条理"
        },
        high_stress: {
          triggers: ["收益大幅下降", "生意出问题"],
          behavior: "会主动询问情况",
          message_style: "急切，问题多"
        }
      }
    }
  },

  // 按地域分类的人格特征
  byLocation: {
    hunan: {
      speechPatterns: {
        signature_phrases: ["晓得不", "搞什么咯", "蛮好的"]
      },
      emotionalExpressions: {
        happiness: "会用😊🥰这些表情",
        excitement: "会说'蛮好的'"
      }
    },
    guangdong: {
      speechPatterns: {
        signature_phrases: ["咁样啊", "好啊", "冇问题"]
      },
      emotionalExpressions: {
        agreement: "会说'好啊'",
        uncertainty: "会说'咁样啊'"
      }
    },
    sichuan: {
      speechPatterns: {
        signature_phrases: ["巴适得很", "莫得问题", "安逸"]
      },
      emotionalExpressions: {
        satisfaction: "会说'巴适得很'",
        agreement: "会说'莫得问题'"
      }
    }
  }
};
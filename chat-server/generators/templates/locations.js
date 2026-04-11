/**
 * 地域模板定义
 */

module.exports = {
  // 深圳
  shenzhen: {
    currentLocation: "广东省深圳市",
    cityFeatures: ["经济发达", "外来人口多", "生活节奏快"],
    livingCost: "high",
    dialect: "粤语/普通话"
  },

  // 广州
  guangzhou: {
    currentLocation: "广东省广州市",
    cityFeatures: ["历史悠久", "商业繁荣", "美食丰富"],
    livingCost: "high",
    dialect: "粤语"
  },

  // 东莞
  dongguan: {
    currentLocation: "广东省东莞市",
    cityFeatures: ["制造业发达", "工厂多", "外来工多"],
    livingCost: "medium",
    dialect: "粤语/普通话"
  },

  // 籍贯来源地
  origins: {
    // 湖南
    hunan: {
      hometown: "湖南省邵阳市",
      culturalFeatures: ["湘菜", "湖南话", "热情"],
      dialect: {
        high_frequency: {
          "搞": "做/弄",
          "晓得": "知道", 
          "咯": "了(语气词)"
        },
        medium_frequency: {
          "蛮": "很",
          "莫得": "没有"
        },
        usage_rules: {
          frequency_modifier: "偶尔用方言，主要说普通话",
          context_appropriate: "熟人对话时会用",
          avoid_overuse: "一条消息最多1个方言词"
        }
      },
      names: {
        male: {
          first: ["刘", "王", "李", "张", "陈", "赵", "孙", "周"],
          last: ["建国", "文强", "军", "伟", "明", "峰", "雷", "鹏"],
          nicknames: ["小刘", "强哥", "军哥", "小伟", "明哥", "峰哥", "雷子", "小王"]
        },
        female: {
          first: ["刘", "王", "李", "张", "陈", "赵", "孙", "周"],
          last: ["霞", "美", "丽", "芳", "娟", "燕", "红", "玲"],
          nicknames: ["小霞", "小美", "丽丽", "芳芳", "小娟", "燕子", "红红", "玲玲"]
        }
      }
    },

    // 广东本地
    guangdong: {
      hometown: "广东省广州市",
      culturalFeatures: ["粤菜", "粤语", "务实"],
      dialect: {
        high_frequency: {
          "搞": "做",
          "咁": "这样"
        },
        medium_frequency: {
          "好": "很",
          "唔": "不"
        },
        usage_rules: {
          frequency_modifier: "偶尔用粤语词汇",
          context_appropriate: "本地人对话时会用",
          avoid_overuse: "一条消息最多1个粤语词"
        }
      },
      names: {
        male: {
          first: ["陈", "李", "黄", "林", "梁", "郭", "何", "吴"],
          last: ["志强", "建华", "伟明", "俊杰", "国华", "文彬", "志华", "建民"],
          nicknames: ["阿强", "华哥", "明仔", "杰仔", "华仔", "彬哥", "华哥", "民哥"]
        },
        female: {
          first: ["陈", "李", "黄", "林", "梁", "郭", "何", "吴"],
          last: ["美玲", "秀华", "丽娟", "雅芳", "慧敏", "淑贤", "婉仪", "嘉欣"],
          nicknames: ["玲姐", "华姐", "娟姐", "芳姐", "敏敏", "贤姐", "仪仪", "欣欣"]
        }
      }
    },

    // 四川
    sichuan: {
      hometown: "四川省成都市",
      culturalFeatures: ["川菜", "四川话", "幽默"],
      dialect: {
        high_frequency: {
          "搞": "弄",
          "晓得": "知道"
        },
        medium_frequency: {
          "巴适": "舒服",
          "莫得": "没有"
        },
        usage_rules: {
          frequency_modifier: "偶尔用四川话",
          context_appropriate: "老乡对话时会用",
          avoid_overuse: "一条消息最多1个方言词"
        }
      },
      names: {
        male: {
          first: ["王", "李", "张", "刘", "陈", "杨", "黄", "赵"],
          last: ["建", "伟", "军", "强", "明", "华", "峰", "涛"],
          nicknames: ["小王", "伟哥", "军哥", "强哥", "明哥", "华哥", "峰哥", "涛哥"]
        },
        female: {
          first: ["王", "李", "张", "刘", "陈", "杨", "黄", "赵"],
          last: ["丽", "美", "芳", "娟", "霞", "燕", "玲", "红"],
          nicknames: ["丽丽", "美美", "芳芳", "娟娟", "小霞", "燕子", "玲玲", "红红"]
        }
      }
    },

    // 河南
    henan: {
      hometown: "河南省郑州市",
      culturalFeatures: ["豫菜", "河南话", "朴实"],
      dialect: {
        high_frequency: {
          "中": "行/好",
          "得劲": "舒服"
        },
        medium_frequency: {
          "咋": "怎么",
          "恁": "你们"
        },
        usage_rules: {
          frequency_modifier: "很少用方言",
          context_appropriate: "老乡对话时偶尔用",
          avoid_overuse: "一条消息最多1个方言词"
        }
      },
      names: {
        male: {
          first: ["王", "李", "张", "刘", "陈", "杨", "赵", "孙"],
          last: ["建设", "国强", "志远", "文博", "海涛", "俊峰", "立军", "德华"],
          nicknames: ["建哥", "强哥", "远哥", "博哥", "涛哥", "峰哥", "军哥", "华哥"]
        },
        female: {
          first: ["王", "李", "张", "刘", "陈", "杨", "赵", "孙"],
          last: ["秀丽", "淑华", "雅静", "慧敏", "丽娟", "美玲", "春燕", "晓红"],
          nicknames: ["丽姐", "华姐", "静静", "敏敏", "娟姐", "玲姐", "燕子", "红姐"]
        }
      }
    },

    // 湖北
    hubei: {
      hometown: "湖北省武汉市",
      culturalFeatures: ["鄂菜", "湖北话", "直爽"],
      dialect: {
        high_frequency: {
          "搞": "弄",
          "晓得": "知道"
        },
        medium_frequency: {
          "蛮": "很",
          "冇得": "没有"
        },
        usage_rules: {
          frequency_modifier: "偶尔用湖北话",
          context_appropriate: "老乡对话时会用",
          avoid_overuse: "一条消息最多1个方言词"
        }
      },
      names: {
        male: {
          first: ["王", "李", "张", "刘", "陈", "杨", "黄", "周"],
          last: ["建", "伟", "军", "强", "明", "华", "峰", "涛"],
          nicknames: ["小王", "伟哥", "军哥", "强哥", "明哥", "华哥", "峰哥", "涛哥"]
        },
        female: {
          first: ["王", "李", "张", "刘", "陈", "杨", "黄", "周"],
          last: ["丽", "美", "芳", "娟", "霞", "燕", "玲", "红"],
          nicknames: ["丽丽", "美美", "芳芳", "娟娟", "小霞", "燕子", "玲玲", "红红"]
        }
      }
    },

    // 福建
    fujian: {
      hometown: "福建省福州市",
      culturalFeatures: ["闽菜", "闽南话", "勤奋"],
      dialect: {
        high_frequency: {
          "搞": "做"
        },
        medium_frequency: {
          "真": "很"
        },
        usage_rules: {
          frequency_modifier: "很少用方言",
          context_appropriate: "老乡对话时偶尔用",
          avoid_overuse: "一条消息最多1个方言词"
        }
      },
      names: {
        male: {
          first: ["林", "陈", "黄", "郑", "吴", "刘", "蔡", "许"],
          last: ["志强", "建华", "伟明", "俊杰", "国华", "文彬", "志华", "建民"],
          nicknames: ["强哥", "华哥", "明哥", "杰哥", "华哥", "彬哥", "华哥", "民哥"]
        },
        female: {
          first: ["林", "陈", "黄", "郑", "吴", "刘", "蔡", "许"],
          last: ["美玲", "秀华", "丽娟", "雅芳", "慧敏", "淑贤", "婉仪", "嘉欣"],
          nicknames: ["玲姐", "华姐", "娟姐", "芳姐", "敏敏", "贤姐", "仪仪", "欣欣"]
        }
      }
    }
  }
};
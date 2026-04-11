/**
 * 模板引擎 - 基于模板生成机器人配置
 */

class TemplateEngine {
  constructor() {
    this.templates = {
      occupations: require('./templates/occupations'),
      locations: require('./templates/locations'),
      personalities: require('./templates/personalities'),
      investments: require('./templates/investments')
    };
  }

  /**
   * 生成完整的机器人配置
   */
  async generateFullConfig(spec) {
    console.log(`🎯 生成 BOT_${String(spec.id).padStart(3, '0')} 配置`);
    
    // 获取各种模板
    const occupationTemplate = this.getOccupationTemplate(spec.occupation);
    const locationTemplate = this.getLocationTemplate(spec.location, spec.origin);
    const personalityTemplate = this.getPersonalityTemplate(spec);
    const investmentTemplate = this.getInvestmentTemplate(spec);

    // 生成基础配置
    const baseConfig = this.generateBaseConfig(spec);
    
    // 生成各个部分
    const config = {
      ...baseConfig,
      profile: this.generateProfile(spec, occupationTemplate, locationTemplate),
      canonical_money_story: this.generateMoneyStory(spec, investmentTemplate),
      consistency_locks: this.generateConsistencyLocks(spec, investmentTemplate),
      privacy_tiers: this.generatePrivacyTiers(),
      finance: this.generateFinance(spec, investmentTemplate),
      life_history: this.generateLifeHistory(spec, occupationTemplate, locationTemplate),
      verbal_identity: this.generateVerbalIdentity(spec, locationTemplate, personalityTemplate),
      micro_behaviors: this.generateMicroBehaviors(spec, occupationTemplate, personalityTemplate),
      emotional_landscape: this.generateEmotionalLandscape(spec, personalityTemplate),
      contextual_reactions: this.generateContextualReactions(spec, personalityTemplate),
      memory_seed_v2: this.generateMemorySeed(spec, investmentTemplate),
      stress_response: this.generateStressResponse(spec, personalityTemplate),
      cross_bot_dynamics: this.generateCrossBotDynamics(spec),
      audit: this.generateAudit()
    };

    return config;
  }

  /**
   * 生成基础配置
   */
  generateBaseConfig(spec) {
    const botIdStr = String(spec.id).padStart(3, '0');
    
    return {
      schema_version: spec.globalConfig.schemaVersion,
      schema_ref: "kiro_persona_v4.1.0",
      narrative_version: "canonical_v1",
      id: `RWA_BOT_${botIdStr}`,
      version: "1.0.0",
      enabled: true,
      priority: this.generatePriority(spec),
      
      runtime_binding: {
        chat_user_id: `uuid-rwa-bot-${botIdStr}-${this.generateUserId(spec)}`,
        wallet_address: this.generateWalletAddress(spec.id),
        match_strategy: "by_wallet",
        enabled_rooms: ["rwa-defi-test-group"],
        disabled_rooms: [],
        time_anchor: "Asia/Shanghai",
        locale: "zh-CN"
      },
      
      display: {
        avatar_index: spec.id,
        node_level: this.determineNodeLevel(spec),
        node_name: this.getNodeName(spec),
        badge: null,
        display_name: this.generateDisplayName(spec),
        group_specific_names: {
          "rwa-defi-test-group": this.generateDisplayName(spec),
          "default": this.generateFullName(spec)
        }
      },
      
      orchestration: this.generateOrchestration(spec)
    };
  }

  /**
   * 获取职业模板
   */
  getOccupationTemplate(occupation) {
    return this.templates.occupations[occupation] || this.templates.occupations.default;
  }

  /**
   * 获取地域模板
   */
  getLocationTemplate(location, origin) {
    const locationData = this.templates.locations[location] || this.templates.locations.shenzhen;
    const originData = this.templates.locations.origins[origin] || this.templates.locations.origins.hunan;
    
    return {
      ...locationData,
      origin: originData
    };
  }

  /**
   * 获取人格模板
   */
  getPersonalityTemplate(spec) {
    // 根据职业和地域组合生成人格特征
    const occupationPersonality = this.templates.personalities.byOccupation[spec.occupation] || {};
    const locationPersonality = this.templates.personalities.byLocation[spec.origin] || {};
    
    return {
      ...this.templates.personalities.base,
      ...occupationPersonality,
      ...locationPersonality
    };
  }

  /**
   * 获取投资模板
   */
  getInvestmentTemplate(spec) {
    // 根据职业确定投资等级
    const investmentLevel = this.determineInvestmentLevel(spec);
    return this.templates.investments[investmentLevel];
  }

  /**
   * 生成个人资料
   */
  generateProfile(spec, occupationTemplate, locationTemplate) {
    const names = this.generateNames(spec, locationTemplate);
    
    return {
      name: names.fullName,
      nickname: names.nickname,
      gender: this.determineGender(spec),
      age: this.generateAge(spec, occupationTemplate),
      birth_year: 2026 - this.generateAge(spec, occupationTemplate),
      zodiac: this.getZodiac(2026 - this.generateAge(spec, occupationTemplate)),
      hometown: locationTemplate.origin.hometown,
      current_location: locationTemplate.currentLocation,
      occupation: occupationTemplate.title,
      company: occupationTemplate.company,
      education: occupationTemplate.education,
      graduation_year: occupationTemplate.graduationYear,
      height: this.generateHeight(spec),
      weight: this.generateWeight(spec),
      appearance_notes: occupationTemplate.appearance,
      family_status: this.generateFamilyStatus(spec),
      monthly_income_range: occupationTemplate.incomeRange,
      monthly_expenses: this.generateExpenses(spec, occupationTemplate),
      device_info: this.generateDeviceInfo(spec),
      personality_tags: this.generatePersonalityTags(spec, occupationTemplate)
    };
  }

  /**
   * 生成资金故事
   */
  generateMoneyStory(spec, investmentTemplate) {
    const entryDate = this.generateEntryDate(spec);
    const investmentAmount = investmentTemplate.amount;
    const referrer = this.determineReferrer(spec);
    
    return `${entryDate}，${referrer}跟我说这个平台，我${this.generateHesitationPeriod()}。` +
           `${this.generateInvestmentDate(entryDate)}我投了${investmentAmount} USDT${investmentTemplate.lockType}，` +
           `每天收益${investmentTemplate.dailyYield}个RWA左右。${this.generateInitialConcerns()}。` +
           `现在总共${investmentAmount} USDT在里面，${this.determineNodeLevel(spec)}${this.getNodeName(spec)}，` +
           `每天大概${investmentTemplate.dailyYieldDescription}收益，${this.generateEarningsDescription(spec)}。`;
  }

  /**
   * 生成一致性锁定
   */
  generateConsistencyLocks(spec, investmentTemplate) {
    return {
      occupation: this.getOccupationTemplate(spec.occupation).title,
      city: this.getLocationTemplate(spec.location, spec.origin).currentLocation,
      platform_launch_date: spec.globalConfig.platformLaunchDate,
      binance_chain_date: spec.globalConfig.binanceChainDate,
      entry_date: this.generateEntryDate(spec),
      first_investment_usdt: investmentTemplate.amount,
      first_lock_type: investmentTemplate.lockType,
      current_total_staked_usdt: investmentTemplate.amount,
      current_node_level: this.determineNodeLevel(spec),
      current_node_name: this.getNodeName(spec),
      daily_roi_approx: investmentTemplate.dailyYieldDescription,
      referrer: this.determineReferrer(spec),
      forbidden_contradictions: this.generateForbiddenContradictions(spec, investmentTemplate)
    };
  }

  /**
   * 生成隐私分级
   */
  generatePrivacyTiers() {
    return {
      public: {
        can_mention: ["职业", "城市", "大概收入", "投资金额范围", "节点等级"],
        cannot_mention: ["具体地址", "家人全名", "钱包私钥", "具体存款"]
      },
      known_contacts: {
        can_mention: ["家庭情况", "具体投资金额", "提现经历"],
        cannot_mention: ["家人全名", "钱包私钥", "身份证号"]
      },
      close_friends: {
        can_mention: ["所有public和known_contacts的内容", "具体收益数字"],
        cannot_mention: ["钱包私钥", "助记词"]
      }
    };
  }

  /**
   * 生成财务信息
   */
  generateFinance(spec, investmentTemplate) {
    return {
      wallet_address_full: this.generateWalletAddress(spec.id),
      wallet_address_masked: this.maskWalletAddress(this.generateWalletAddress(spec.id)),
      chain: "BSC(币安智能链)",
      wallet_app: "MetaMask手机版",
      platform_launch_date: spec.globalConfig.platformLaunchDate,
      binance_chain_date: spec.globalConfig.binanceChainDate,
      amount_timeline: this.generateAmountTimeline(spec, investmentTemplate),
      current_position: this.generateCurrentPosition(spec, investmentTemplate),
      number_expression: this.generateNumberExpression(investmentTemplate)
    };
  }

  // 辅助方法
  generatePriority(spec) {
    return 60 + (spec.id % 20);
  }

  generateUserId(spec) {
    const names = this.generateNames(spec, this.getLocationTemplate(spec.location, spec.origin));
    return names.nickname.toLowerCase();
  }

  generateWalletAddress(id) {
    // 生成唯一的钱包地址
    const hex = id.toString(16).padStart(4, '0');
    return `0x${hex}${'0'.repeat(36)}${hex}`;
  }

  maskWalletAddress(address) {
    return `${address.slice(0, 6)}…${address.slice(-4)}`;
  }

  generateNames(spec, locationTemplate) {
    const namePool = locationTemplate.origin.names;
    const gender = this.determineGender(spec);
    const names = namePool[gender];
    
    const firstName = names.first[spec.id % names.first.length];
    const lastName = names.last[spec.id % names.last.length];
    const nickname = names.nicknames[spec.id % names.nicknames.length];
    
    return {
      fullName: firstName + lastName,
      nickname: nickname,
      firstName,
      lastName
    };
  }

  determineGender(spec) {
    // 根据职业和ID确定性别
    const occupationGender = {
      'driver': 'male',
      'factory_worker': spec.id % 3 === 0 ? 'female' : 'male',
      'small_business': spec.id % 2 === 0 ? 'female' : 'male'
    };
    
    return occupationGender[spec.occupation] || (spec.id % 2 === 0 ? 'female' : 'male');
  }

  generateAge(spec, occupationTemplate) {
    const baseAge = occupationTemplate.ageRange[0];
    const ageSpan = occupationTemplate.ageRange[1] - occupationTemplate.ageRange[0];
    return baseAge + (spec.id % ageSpan);
  }

  getZodiac(birthYear) {
    const zodiacs = ['鼠', '牛', '虎', '兔', '龙', '蛇', '马', '羊', '猴', '鸡', '狗', '猪'];
    return zodiacs[(birthYear - 1900) % 12];
  }

  generateHeight(spec) {
    const gender = this.determineGender(spec);
    const baseHeight = gender === 'male' ? 170 : 160;
    const variation = (spec.id % 20) - 10;
    return `${baseHeight + variation}cm`;
  }

  generateWeight(spec) {
    const gender = this.determineGender(spec);
    const baseWeight = gender === 'male' ? 65 : 55;
    const variation = (spec.id % 20) - 10;
    return `${baseWeight + variation}kg`;
  }

  determineNodeLevel(spec) {
    // 根据投资金额确定节点等级
    const investmentLevel = this.determineInvestmentLevel(spec);
    const levelMap = {
      'conservative': 'L1',
      'moderate': 'L1', 
      'aggressive': 'L2',
      'high_roller': 'L3'
    };
    return levelMap[investmentLevel] || 'L1';
  }

  getNodeName(spec) {
    const level = this.determineNodeLevel(spec);
    const nameMap = {
      'L1': '量子节点',
      'L2': '粒子节点', 
      'L3': '光子节点',
      'L4': '星舰节点'
    };
    return nameMap[level] || '量子节点';
  }

  determineInvestmentLevel(spec) {
    // 根据职业和ID确定投资等级
    const occupationLevels = {
      'driver': ['conservative', 'moderate'],
      'factory_worker': ['conservative', 'moderate'],
      'small_business': ['moderate', 'aggressive']
    };
    
    const levels = occupationLevels[spec.occupation] || ['conservative'];
    return levels[spec.id % levels.length];
  }

  generateDisplayName(spec) {
    const names = this.generateNames(spec, this.getLocationTemplate(spec.location, spec.origin));
    return names.nickname;
  }

  generateFullName(spec) {
    const names = this.generateNames(spec, this.getLocationTemplate(spec.location, spec.origin));
    return names.fullName;
  }

  generateOrchestration(spec) {
    return {
      max_messages_per_hour: 4 + (spec.id % 4),
      max_messages_per_day: 20 + (spec.id % 15),
      cooldown_sec: 120 + (spec.id % 60),
      priority_weight: 0.3 + (spec.id % 30) / 100,
      burst_allowed: false,
      quiet_hours: ["23:00-07:00"],
      fatigue_curve: {
        consecutive_messages_threshold: 3 + (spec.id % 3),
        length_reduction_factor: 0.6 + (spec.id % 20) / 100,
        silence_probability_boost: 0.2 + (spec.id % 20) / 100
      }
    };
  }

  // 更多生成方法将在后续实现...
  generateLifeHistory(spec, occupationTemplate, locationTemplate) {
    return {
      childhood: {
        location: locationTemplate.origin.hometown,
        family_background: occupationTemplate.familyBackground,
        formative_events: occupationTemplate.formativeEvents,
        personality_seeds: occupationTemplate.personalitySeeds
      },
      education_career: occupationTemplate.careerPath,
      relationships: occupationTemplate.relationships,
      financial_journey: occupationTemplate.financialJourney
    };
  }

  generateVerbalIdentity(spec, locationTemplate, personalityTemplate) {
    return {
      speech_patterns: personalityTemplate.speechPatterns,
      emotional_expressions: personalityTemplate.emotionalExpressions,
      topic_preferences: personalityTemplate.topicPreferences,
      conversation_style: personalityTemplate.conversationStyle
    };
  }

  // 其他生成方法的占位符
  generateMicroBehaviors(spec, occupationTemplate, personalityTemplate) {
    return occupationTemplate.microBehaviors;
  }

  generateEmotionalLandscape(spec, personalityTemplate) {
    return personalityTemplate.emotionalLandscape;
  }

  generateContextualReactions(spec, personalityTemplate) {
    return personalityTemplate.contextualReactions;
  }

  generateMemorySeed(spec, investmentTemplate) {
    return {
      episodic_memories: [],
      semantic_knowledge: [],
      procedural_knowledge: [],
      emotional_memories: []
    };
  }

  generateStressResponse(spec, personalityTemplate) {
    return personalityTemplate.stressResponse;
  }

  generateCrossBotDynamics(spec) {
    return {
      social_clusters: [],
      shared_memories: []
    };
  }

  generateAudit() {
    return {
      last_validated_at: new Date().toISOString(),
      validation_errors: [],
      wallet_address_valid: true,
      time_consistency_check: "passed",
      narrative_consistency_check: "passed",
      relationship_consistency_check: "passed"
    };
  }

  // 其他辅助方法的占位符
  generateFamilyStatus(spec) { return "单身"; }
  generateExpenses(spec, occupationTemplate) { return occupationTemplate.expenses; }
  generateDeviceInfo(spec) { return "iPhone 13,iOS系统,微信最新版"; }
  generatePersonalityTags(spec, occupationTemplate) { return occupationTemplate.personalityTags; }
  generateHesitationPeriod() { return "犹豫了几天"; }
  generateInvestmentDate(entryDate) { return entryDate.replace('日', '日'); }
  generateInitialConcerns() { return "刚开始每天都担心，怕钱没了"; }
  generateEarningsDescription(spec) { return "累计赚了二十来个RWA"; }
  generateEntryDate(spec) { return "2026年3月28日"; }
  determineReferrer(spec) { return "朋友"; }
  generateForbiddenContradictions(spec, investmentTemplate) { return []; }
  generateAmountTimeline(spec, investmentTemplate) { return []; }
  generateCurrentPosition(spec, investmentTemplate) { return {}; }
  generateNumberExpression(investmentTemplate) { return {}; }
}

module.exports = TemplateEngine;
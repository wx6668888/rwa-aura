/**
 * Database Model Types
 * 
 * CRITICAL: All amount fields are stored as DECIMAL(38, 0) in database
 * They represent 18-bit integers (e.g., 1 USDT = 1000000000000000000)
 * 
 * Use string type in TypeScript to prevent precision loss
 * Use ethers.BigNumber or bignumber.js for calculations
 */

export interface User {
    address: string;
    referrer: string | null;
    referral_path: string | null;
    node_level: number;
    total_staked: string; // 18-bit integer as string (current)
    cumulative_personal_stake?: string; // 18-bit integer, cumulative for node level (only increases)
    team_volume: string; // 18-bit integer as string
    rwa_pending: string; // 18-bit integer as string
    usdt_rewards: string; // 18-bit integer as string
    direct_referral_count: number;
    last_withdraw_time: Date | null;
    first_stake_time: Date | null;
    is_active: boolean;
    created_at: Date;
    updated_at: Date;
}

export interface DepartmentVolume {
    id: number;
    user_address: string;
    direct_referral: string;
    department_volume: string; // 18-bit integer as string
    updated_at: Date;
}

export interface Stake {
    id: number;
    user_address: string;
    amount: string; // 18-bit integer as string
    tx_hash: string;
    block_number: number;
    timestamp: Date;
    created_at: Date;
}

export interface Reward {
    id: number;
    user_address: string;
    reward_type: 'static' | 'differential';
    token_type: 'RWA' | 'USDT';
    amount: string; // 18-bit integer as string
    from_user: string | null;
    stake_id: number | null;
    timestamp: Date;
    created_at: Date;
}

export interface NodeLevelHistory {
    id: number;
    user_address: string;
    old_level: number;
    new_level: number;
    team_volume: string; // 18-bit integer as string
    direct_v_count: number;
    timestamp: Date;
    created_at: Date;
}

export interface ReferralRelation {
    id: number;
    user_address: string;
    ancestor_address: string;
    depth: number;
    created_at: Date;
}

export interface EventProcessingState {
    id: number;
    last_processed_block: number;
    updated_at: Date;
}

export interface SystemConfig {
    config_key: string;
    config_value: string;
    description: string | null;
    updated_at: Date;
}

// View types
export interface UserSummary extends User {
    total_referral_count: number;
    direct_count_from_relations: number;
}

export interface DepartmentSummary {
    user_address: string;
    department_count: number;
    max_department_volume: string; // 18-bit integer as string
    total_department_volume: string; // 18-bit integer as string
}

// Node level requirements (基于金额考核，不要求直推数量)
export interface NodeLevelRequirement {
    level: number;
    name: string;              // 中文名称
    nameEn: string;            // 英文名称
    emoji: string;             // 徽章表情
    teamVolumeUSDT: string;    // 团队总质押要求（USDT，18位精度）
    personalStakeUSDT: string; // 个人质押要求（USDT，18位精度）
    teamRetainedUSDT: string;  // 总留存要求：团队充值-团队提现（USDT等值，18位精度）
    rewardPercentage: number;  // 等级差奖励百分比
    projectDividendEligible: boolean; // 是否参与项目分红
    dividendWeight: number;    // 分红权重
}

export const NODE_REQUIREMENTS: NodeLevelRequirement[] = [
    {
        level: 1,
        name: '量子',
        nameEn: 'Quantum',
        emoji: '⚡',
        teamVolumeUSDT: '0',
        personalStakeUSDT: '0',
        teamRetainedUSDT: '0',
        rewardPercentage: 3,
        projectDividendEligible: false,
        dividendWeight: 0
    },
    {
        level: 2,
        name: '粒子',
        nameEn: 'Particle',
        emoji: '🔬',
        teamVolumeUSDT: '5000000000000000000000', // 5,000 USDT
        personalStakeUSDT: '500000000000000000000', // 500 USDT
        teamRetainedUSDT: '2000000000000000000000', // 2,000 USDT 总留存
        rewardPercentage: 5,
        projectDividendEligible: true,
        dividendWeight: 1.0
    },
    {
        level: 3,
        name: '光子',
        nameEn: 'Photon',
        emoji: '✨',
        teamVolumeUSDT: '20000000000000000000000', // 20,000 USDT
        personalStakeUSDT: '1000000000000000000000', // 1,000 USDT
        teamRetainedUSDT: '8000000000000000000000', // 8,000 USDT
        rewardPercentage: 8,
        projectDividendEligible: true,
        dividendWeight: 1.0
    },
    {
        level: 4,
        name: '星舰',
        nameEn: 'Starship',
        emoji: '🛸',
        teamVolumeUSDT: '50000000000000000000000', // 50,000 USDT
        personalStakeUSDT: '3000000000000000000000', // 3,000 USDT
        teamRetainedUSDT: '20000000000000000000000', // 20,000 USDT
        rewardPercentage: 12,
        projectDividendEligible: true,
        dividendWeight: 1.0
    },
    {
        level: 5,
        name: '彗星',
        nameEn: 'Comet',
        emoji: '☄️',
        teamVolumeUSDT: '150000000000000000000000', // 150,000 USDT
        personalStakeUSDT: '8000000000000000000000', // 8,000 USDT
        teamRetainedUSDT: '60000000000000000000000', // 60,000 USDT
        rewardPercentage: 17,
        projectDividendEligible: true,
        dividendWeight: 1.0
    },
    {
        level: 6,
        name: '行星',
        nameEn: 'Planet',
        emoji: '🪐',
        teamVolumeUSDT: '400000000000000000000000', // 400,000 USDT
        personalStakeUSDT: '20000000000000000000000', // 20,000 USDT
        teamRetainedUSDT: '160000000000000000000000', // 160,000 USDT
        rewardPercentage: 23,
        projectDividendEligible: true,
        dividendWeight: 1.5
    },
    {
        level: 7,
        name: '恒星',
        nameEn: 'Star',
        emoji: '⭐',
        teamVolumeUSDT: '1000000000000000000000000', // 1,000,000 USDT
        personalStakeUSDT: '50000000000000000000000', // 50,000 USDT
        teamRetainedUSDT: '400000000000000000000000', // 400,000 USDT
        rewardPercentage: 30,
        projectDividendEligible: true,
        dividendWeight: 1.5
    },
    {
        level: 8,
        name: '星云',
        nameEn: 'Nebula',
        emoji: '🌌',
        teamVolumeUSDT: '2500000000000000000000000', // 2,500,000 USDT
        personalStakeUSDT: '100000000000000000000000', // 100,000 USDT
        teamRetainedUSDT: '1000000000000000000000000', // 1,000,000 USDT
        rewardPercentage: 35,
        projectDividendEligible: true,
        dividendWeight: 2.0
    },
    {
        level: 9,
        name: '超新星',
        nameEn: 'Supernova',
        emoji: '💫',
        teamVolumeUSDT: '5000000000000000000000000', // 5,000,000 USDT
        personalStakeUSDT: '200000000000000000000000', // 200,000 USDT
        teamRetainedUSDT: '2000000000000000000000000', // 2,000,000 USDT
        rewardPercentage: 40,
        projectDividendEligible: true,
        dividendWeight: 3.0
    }
];

// Node reward percentages (最高40%)
export const NODE_REWARD_PERCENTAGES: Record<number, number> = {
    1: 0.03,  // L1: 3%
    2: 0.05,  // L2: 5%
    3: 0.08,  // L3: 8%
    4: 0.12,  // L4: 12%
    5: 0.17,  // L5: 17%
    6: 0.23,  // L6: 23%
    7: 0.30,  // L7: 30%
    8: 0.35,  // L8: 35%
    9: 0.40   // L9: 40%
};

// Reward distribution result
export interface RewardDistribution {
    beneficiary: string;
    amount: string; // 18-bit integer as string
    percentage: number;
    nodeLevel: number;
    fromUser: string;
    stakeId: number;
    burned?: boolean; // Whether reward was burned due to burn mechanism
    originalAmount?: string; // Original calculated amount before burn
}

// Precision constants
export const PRECISION = {
    USDT_DECIMALS: 6,
    INTERNAL_DECIMALS: 18,
    MULTIPLIER: '1000000000000' // 10^12
};

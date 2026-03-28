import BigNumber from 'bignumber.js';
import { query } from '../config/database.config';
import { NODE_REQUIREMENTS, User } from '../models/types';
import logger from '../utils/logger';

export interface EffectiveLevelResult {
  level: number;
  cumulativePersonalStake: string; // 18-dec USDT
  teamVolume: string;              // 18-dec USDT (team_volume from users)
  teamTotalDeposited: string;      // 18-dec USDT
  teamTotalWithdrawn: string;      // 18-dec USDT
  teamRetained: string;            // 18-dec USDT, max(0, deposited - withdrawn)
}

/**
 * 统一的节点等级计算服务
 *
 * 规则：
 * - 个人：使用 users.cumulative_personal_stake（18位精度 USDT 等值）
 * - 团队量：使用 users.team_volume（18位精度）
 * - 总留存：max(0, team_total_deposited - team_total_withdrawn)，18位精度
 * - 等级：从 L1→L9 依次判断，满足更高等级的要求就升级
 */
export class EffectiveLevelService {
  async getEffectiveLevel(userAddress: string): Promise<EffectiveLevelResult> {
    const rows = await query<User[]>(
      `SELECT 
         COALESCE(cumulative_personal_stake, 0) AS cumulative_personal_stake,
         COALESCE(team_volume, 0)              AS team_volume,
         COALESCE(team_total_deposited, 0)     AS team_total_deposited,
         COALESCE(team_total_withdrawn, 0)     AS team_total_withdrawn
       FROM users
       WHERE address = ?`,
      [userAddress.toLowerCase()]
    );

    if (rows.length === 0) {
      return {
        level: 1,
        cumulativePersonalStake: '0',
        teamVolume: '0',
        teamTotalDeposited: '0',
        teamTotalWithdrawn: '0',
        teamRetained: '0',
      };
    }

    const row: any = rows[0];
    const cumulativePersonalStake = new BigNumber(row.cumulative_personal_stake?.toString() ?? '0');
    const teamVolume = new BigNumber(row.team_volume?.toString() ?? '0');
    const teamTotalDeposited = new BigNumber(row.team_total_deposited?.toString() ?? '0');
    const teamTotalWithdrawn = new BigNumber(row.team_total_withdrawn?.toString() ?? '0');

    const teamRetained = BigNumber.max(
      new BigNumber(0),
      teamTotalDeposited.minus(teamTotalWithdrawn)
    );

    let level = 1;
    for (const req of NODE_REQUIREMENTS) {
      if (req.level === 1) {
        level = 1;
        continue;
      }

      const personalOk = cumulativePersonalStake.gte(new BigNumber(req.personalStakeUSDT));
      const teamVolumeOk = teamVolume.gte(new BigNumber(req.teamVolumeUSDT));
      const retainedOk = teamRetained.gte(new BigNumber(req.teamRetainedUSDT));

      if (personalOk && teamVolumeOk && retainedOk) {
        level = req.level;
      } else {
        // 要求从低到高，第一次不满足就可以提前结束
        break;
      }
    }

    logger.info(
      `[EffectiveLevelService] user=${userAddress}, level=${level}, ` +
        `personal=${cumulativePersonalStake.toString()}, teamVolume=${teamVolume.toString()}, ` +
        `teamDep=${teamTotalDeposited.toString()}, teamWdr=${teamTotalWithdrawn.toString()}, ` +
        `retained=${teamRetained.toString()}`
    );

    return {
      level,
      cumulativePersonalStake: cumulativePersonalStake.toFixed(0),
      teamVolume: teamVolume.toFixed(0),
      teamTotalDeposited: teamTotalDeposited.toFixed(0),
      teamTotalWithdrawn: teamTotalWithdrawn.toFixed(0),
      teamRetained: teamRetained.toFixed(0),
    };
  }
}


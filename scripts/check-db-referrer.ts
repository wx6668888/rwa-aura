import { getPool } from '../backend/src/config/database.config';
import { query } from '../backend/src/config/database.config';

/**
 * 检查数据库中用户的推荐人信息
 * 
 * 使用方式:
 * npx ts-node scripts/check-db-referrer.ts
 */

async function main() {
    console.log("\n=== 检查数据库中用户的推荐人信息 ===\n");

    const userAddress = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";
    console.log("用户地址:", userAddress);
    console.log("");

    try {
        console.log("✅ 正在连接数据库...\n");

        const normalizedAddress = userAddress.toLowerCase();

        // 1. 检查 users 表中的推荐人信息
        console.log("📊 1. 检查 users 表中的推荐人信息:");
        const usersRows = await query<any[]>(
            'SELECT address, referrer, node_level, total_staked, first_stake_time, created_at FROM users WHERE address = ?',
            [normalizedAddress]
        );

        if (usersRows.length === 0) {
            console.log("   ⚠️  在 users 表中未找到该用户");
        } else {
            const user = usersRows[0];
            console.log("   ✅ 找到用户信息:");
            console.log("      地址:", user.address);
            console.log("      推荐人:", user.referrer || "❌ 无推荐人");
            console.log("      节点等级:", user.node_level);
            console.log("      总质押:", user.total_staked?.toString() || "0");
            console.log("      首次质押时间:", user.first_stake_time || "未设置");
            console.log("      创建时间:", user.created_at);
        }
        console.log("");

        // 2. 检查 rwa_stakes 表中的推荐人信息
        console.log("📊 2. 检查 rwa_stakes 表中的推荐人信息:");
        const rwaStakesRows = await query<any[]>(
            'SELECT user_address, referrer, total_staked_rwa, first_stake_time, created_at FROM rwa_stakes WHERE user_address = ?',
            [normalizedAddress]
        );

        if (rwaStakesRows.length === 0) {
            console.log("   ⚠️  在 rwa_stakes 表中未找到该用户");
        } else {
            const rwaStake = rwaStakesRows[0];
            console.log("   ✅ 找到 RWA 质押信息:");
            console.log("      地址:", rwaStake.user_address);
            console.log("      推荐人:", rwaStake.referrer || "❌ 无推荐人");
            console.log("      总 RWA 质押:", rwaStake.total_staked_rwa?.toString() || "0");
            console.log("      首次质押时间:", rwaStake.first_stake_time ? new Date(Number(rwaStake.first_stake_time) * 1000).toLocaleString() : "未设置");
            console.log("      创建时间:", rwaStake.created_at);
        }
        console.log("");

        // 3. 检查 referral_relations 表中的推荐关系
        console.log("📊 3. 检查 referral_relations 表中的推荐关系:");
        const referralRows = await query<any[]>(
            'SELECT user_address, ancestor_address, depth FROM referral_relations WHERE user_address = ? ORDER BY depth',
            [normalizedAddress]
        );

        if (referralRows.length === 0) {
            console.log("   ⚠️  在 referral_relations 表中未找到该用户的推荐关系");
        } else {
            console.log(`   ✅ 找到 ${referralRows.length} 条推荐关系:`);
            referralRows.forEach((rel: any, index: number) => {
                console.log(`      关系 ${index + 1}:`);
                console.log("        用户地址:", rel.user_address);
                console.log("        祖先地址:", rel.ancestor_address);
                console.log("        深度:", rel.depth, rel.depth === 1 ? "(直推)" : `(第${rel.depth}层)`);
            });
        }
        console.log("");

        // 4. 检查该用户作为推荐人的情况（直推列表）
        console.log("📊 4. 检查该用户作为推荐人的情况（直推列表）:");
        const directReferralsRows = await query<any[]>(
            'SELECT address, node_level, total_staked, first_stake_time FROM users WHERE referrer = ? ORDER BY created_at DESC',
            [normalizedAddress]
        );

        if (directReferralsRows.length === 0) {
            console.log("   ⚠️  该用户没有直推用户");
        } else {
            console.log(`   ✅ 找到 ${directReferralsRows.length} 个直推用户:`);
            directReferralsRows.forEach((ref: any, index: number) => {
                console.log(`      直推 ${index + 1}:`);
                console.log("        地址:", ref.address);
                console.log("        节点等级:", ref.node_level);
                console.log("        总质押:", ref.total_staked?.toString() || "0");
                console.log("        首次质押时间:", ref.first_stake_time || "未设置");
            });
        }
        console.log("");

        // 5. 检查质押事件（从 stakes 表）
        console.log("📊 5. 检查质押事件（从 stakes 表）:");
        const stakesRows = await query<any[]>(
            'SELECT stake_id, amount, referrer, lock_period, timestamp FROM stakes WHERE user_address = ? ORDER BY timestamp DESC LIMIT 5',
            [normalizedAddress]
        );

        if (stakesRows.length === 0) {
            console.log("   ⚠️  在 stakes 表中未找到该用户的质押记录");
        } else {
            console.log(`   ✅ 找到 ${stakesRows.length} 条质押记录（显示最近5条）:`);
            stakesRows.forEach((stake: any, index: number) => {
                console.log(`      质押 ${index + 1}:`);
                console.log("        Stake ID:", stake.stake_id);
                console.log("        金额:", stake.amount?.toString() || "0");
                console.log("        推荐人:", stake.referrer || "❌ 无推荐人");
                console.log("        锁仓期:", stake.lock_period, "天");
                console.log("        时间:", stake.timestamp ? new Date(Number(stake.timestamp) * 1000).toLocaleString() : "未设置");
            });
        }
        console.log("");

        console.log("=== 检查完成 ===\n");

    } catch (error: any) {
        console.error("❌ 错误:", error.message);
        if (error.code === 'ECONNREFUSED') {
            console.error("\n请确保:");
            console.error("1. MySQL 服务正在运行");
            console.error("2. 数据库配置正确（检查 backend/.env 文件）");
            console.error("3. 数据库 rwa_protocol 已创建");
        }
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

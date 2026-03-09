import { query } from '../backend/src/config/database.config';

/**
 * 检查数据库中的质押记录
 */

async function main() {
    console.log("\n=== 检查数据库中的质押记录 ===\n");

    const userAddress = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";
    const referrerAddress = "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC";

    console.log("用户地址:", userAddress);
    console.log("推荐人地址:", referrerAddress);
    console.log("");

    try {
        console.log("✅ 开始查询数据库");
        console.log("");

        // 1. 检查用户的质押记录
        console.log("📊 1. 检查用户的质押记录 (stakes 表):");
        const stakes = await query<any[]>(
            `SELECT * FROM stakes WHERE user_address = ? ORDER BY timestamp DESC LIMIT 10`,
            [userAddress.toLowerCase()]
        );

        if (stakes.length === 0) {
            console.log("   ⚠️  未找到质押记录");
        } else {
            console.log(`   ✅ 找到 ${stakes.length} 条质押记录:`);
            stakes.forEach((stake, index) => {
                console.log(`\n   记录 ${index + 1}:`);
                console.log(`     ID: ${stake.id}`);
                console.log(`     用户: ${stake.user_address}`);
                console.log(`     金额: ${stake.amount}`);
                console.log(`     资产类型: ${stake.asset_type}`);
                console.log(`     锁仓期: ${stake.lock_period} 天`);
                console.log(`     交易哈希: ${stake.tx_hash}`);
                console.log(`     区块号: ${stake.block_number}`);
                console.log(`     时间戳: ${stake.timestamp}`);
            });
        }
        console.log("");

        // 2. 检查 RWA 质押记录
        console.log("📊 2. 检查 RWA 质押记录 (rwa_stakes 表):");
        const rwaStakes = await query<any[]>(
            `SELECT * FROM rwa_stakes WHERE user_address = ?`,
            [userAddress.toLowerCase()]
        );

        if (rwaStakes.length === 0) {
            console.log("   ⚠️  未找到 RWA 质押记录");
        } else {
            console.log(`   ✅ 找到 ${rwaStakes.length} 条 RWA 质押记录:`);
            rwaStakes.forEach((stake, index) => {
                console.log(`\n   记录 ${index + 1}:`);
                console.log(`     用户: ${stake.user_address}`);
                console.log(`     总 RWA 质押: ${stake.total_staked_rwa}`);
                console.log(`     RWA 待提取: ${stake.rwa_pending}`);
                console.log(`     推荐人: ${stake.referrer || '未设置'}`);
                console.log(`     推荐人匹配: ${stake.referrer?.toLowerCase() === referrerAddress.toLowerCase() ? '✅ 是' : '❌ 否'}`);
                console.log(`     首次质押时间: ${stake.first_stake_time ? new Date(Number(stake.first_stake_time) * 1000).toLocaleString() : '未设置'}`);
                console.log(`     节点等级: ${stake.node_level}`);
                console.log(`     是否活跃: ${stake.is_active}`);
                console.log(`     创建时间: ${stake.created_at}`);
                console.log(`     更新时间: ${stake.updated_at}`);
            });
        }
        console.log("");

        // 3. 检查用户信息
        console.log("📊 3. 检查用户信息 (users 表):");
        const users = await query<any[]>(
            `SELECT * FROM users WHERE address = ?`,
            [userAddress.toLowerCase()]
        );

        if (users.length === 0) {
            console.log("   ⚠️  未找到用户记录");
        } else {
            console.log(`   ✅ 找到用户记录:`);
            users.forEach((user, index) => {
                console.log(`\n   用户 ${index + 1}:`);
                console.log(`     地址: ${user.address}`);
                console.log(`     总质押: ${user.total_staked}`);
                console.log(`     推荐人: ${user.referrer || '未设置'}`);
                console.log(`     推荐人匹配: ${user.referrer?.toLowerCase() === referrerAddress.toLowerCase() ? '✅ 是' : '❌ 否'}`);
                console.log(`     首次质押时间: ${user.first_stake_time ? new Date(user.first_stake_time).toLocaleString() : '未设置'}`);
                console.log(`     是否活跃: ${user.is_active}`);
            });
        }
        console.log("");

        // 4. 检查最近的质押记录（所有用户）
        console.log("📊 4. 检查最近的质押记录（所有用户，最近10条）:");
        const recentStakes = await query<any[]>(
            `SELECT * FROM stakes ORDER BY timestamp DESC LIMIT 10`
        );

        if (recentStakes.length === 0) {
            console.log("   ⚠️  数据库中没有质押记录");
        } else {
            console.log(`   ✅ 找到 ${recentStakes.length} 条最近的质押记录:`);
            recentStakes.forEach((stake, index) => {
                const isUserStake = stake.user_address.toLowerCase() === userAddress.toLowerCase();
                console.log(`\n   记录 ${index + 1} ${isUserStake ? '✅ (您的交易)' : ''}:`);
                console.log(`     用户: ${stake.user_address}`);
                console.log(`     金额: ${stake.amount}`);
                console.log(`     资产类型: ${stake.asset_type}`);
                console.log(`     锁仓期: ${stake.lock_period} 天`);
                console.log(`     交易哈希: ${stake.tx_hash}`);
                console.log(`     时间戳: ${stake.timestamp}`);
            });
        }
        console.log("");

    } catch (error: any) {
        console.error("❌ 错误:", error.message);
        if (error.code === 'ECONNREFUSED') {
            console.error("   数据库连接被拒绝，请检查数据库是否运行");
        } else if (error.code === 'ER_ACCESS_DENIED_ERROR') {
            console.error("   数据库访问被拒绝，请检查用户名和密码");
        }
    }

    console.log("\n=== 检查完成 ===\n");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

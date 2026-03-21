import { getStats, closePool } from '../config/database.config';
import { ethers } from 'ethers';

/**
 * Database Statistics Script
 * Displays current database statistics
 */

async function main() {
    console.log('='.repeat(60));
    console.log('RWA Protocol - Database Statistics');
    console.log('='.repeat(60));
    console.log('');
    
    try {
        const stats = await getStats();
        
        console.log('📊 Overview:');
        console.log(`  Total Users: ${stats.totalUsers}`);
        console.log(`  Total Stakes: ${stats.totalStakes}`);
        console.log(`  Total Rewards: ${stats.totalRewards}`);
        console.log('');
        
        console.log('💰 Financial:');
        const totalStakedFormatted = ethers.formatUnits(stats.totalStaked || '0', 18);
        console.log(`  Total Staked: ${totalStakedFormatted} USDT`);
        console.log('');
        
        console.log('✅ Database connection healthy');
        
    } catch (error) {
        console.error('❌ Error fetching statistics:', error);
        process.exit(1);
    } finally {
        await closePool();
    }
}

main();

import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';

/**
 * Database Migration: Initial Schema
 * Version: 001
 * Date: 2026-02-26
 * 
 * Creates all tables, indexes, views, and stored procedures
 */

interface MigrationConfig {
    host: string;
    port: number;
    user: string;
    password: string;
    database?: string;
}

export async function up(config: MigrationConfig): Promise<void> {
    console.log('Running migration 001: Initial Schema');
    
    // Create connection without database selection
    const connection = await mysql.createConnection({
        host: config.host,
        port: config.port,
        user: config.user,
        password: config.password,
        multipleStatements: true
    });
    
    try {
        // Read SQL file
        const sqlPath = path.join(__dirname, '..', 'database.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');
        
        // Execute SQL
        console.log('Executing database schema...');
        await connection.query(sql);
        
        console.log('✅ Migration 001 completed successfully');
        console.log('Created tables:');
        console.log('  - users');
        console.log('  - department_volumes');
        console.log('  - stakes');
        console.log('  - rewards');
        console.log('  - node_level_history');
        console.log('  - referral_relations');
        console.log('  - event_processing_state');
        console.log('  - system_config');
        console.log('Created views:');
        console.log('  - v_user_summary');
        console.log('  - v_department_summary');
        console.log('Created stored procedures:');
        console.log('  - sp_build_referral_relations');
        console.log('  - sp_update_team_volume');
        
    } catch (error) {
        console.error('❌ Migration 001 failed:', error);
        throw error;
    } finally {
        await connection.end();
    }
}

export async function down(config: MigrationConfig): Promise<void> {
    console.log('Rolling back migration 001: Initial Schema');
    
    const connection = await mysql.createConnection({
        host: config.host,
        port: config.port,
        user: config.user,
        password: config.password,
        database: config.database || 'rwa_protocol'
    });
    
    try {
        // Drop all objects in reverse order
        await connection.query('DROP VIEW IF EXISTS v_department_summary');
        await connection.query('DROP VIEW IF EXISTS v_user_summary');
        await connection.query('DROP PROCEDURE IF EXISTS sp_update_team_volume');
        await connection.query('DROP PROCEDURE IF EXISTS sp_build_referral_relations');
        await connection.query('DROP TABLE IF EXISTS system_config');
        await connection.query('DROP TABLE IF EXISTS event_processing_state');
        await connection.query('DROP TABLE IF EXISTS referral_relations');
        await connection.query('DROP TABLE IF EXISTS node_level_history');
        await connection.query('DROP TABLE IF EXISTS rewards');
        await connection.query('DROP TABLE IF EXISTS stakes');
        await connection.query('DROP TABLE IF EXISTS department_volumes');
        await connection.query('DROP TABLE IF EXISTS users');
        
        console.log('✅ Migration 001 rolled back successfully');
        
    } catch (error) {
        console.error('❌ Rollback failed:', error);
        throw error;
    } finally {
        await connection.end();
    }
}

// CLI execution
if (require.main === module) {
    const config: MigrationConfig = {
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '3306'),
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'rwa_protocol'
    };
    
    const command = process.argv[2];
    
    if (command === 'up') {
        up(config)
            .then(() => process.exit(0))
            .catch((error) => {
                console.error(error);
                process.exit(1);
            });
    } else if (command === 'down') {
        down(config)
            .then(() => process.exit(0))
            .catch((error) => {
                console.error(error);
                process.exit(1);
            });
    } else {
        console.log('Usage: ts-node 001_initial_schema.ts [up|down]');
        process.exit(1);
    }
}

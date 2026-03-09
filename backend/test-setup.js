/**
 * 后端环境测试脚本
 * 
 * 用于验证：
 * 1. 数据库连接
 * 2. Redis 连接
 * 3. 环境变量配置
 */

require('dotenv').config({ path: '../.env' });
const mysql = require('mysql2/promise');
const redis = require('redis');

console.log('='.repeat(60));
console.log('后端环境测试');
console.log('='.repeat(60));
console.log('');

// 测试 1: 环境变量
console.log('1. 检查环境变量...');
const requiredEnvVars = [
    'DB_HOST',
    'DB_PORT',
    'DB_NAME',
    'DB_USER',
    'DB_PASSWORD',
    'REDIS_HOST',
    'REDIS_PORT'
];

let envCheckPassed = true;
for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
        console.log(`   ❌ 缺少环境变量: ${envVar}`);
        envCheckPassed = false;
    } else {
        console.log(`   ✅ ${envVar}: ${envVar.includes('PASSWORD') ? '***' : process.env[envVar]}`);
    }
}

if (!envCheckPassed) {
    console.log('');
    console.log('❌ 环境变量检查失败');
    console.log('请检查 .env 文件配置');
    process.exit(1);
}

console.log('   ✅ 环境变量检查通过');
console.log('');

// 测试 2: 数据库连接
async function testDatabase() {
    console.log('2. 测试数据库连接...');
    try {
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            port: parseInt(process.env.DB_PORT),
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME
        });
        
        console.log('   ✅ 数据库连接成功');
        
        // 测试查询
        const [rows] = await connection.query('SELECT 1 + 1 AS result');
        console.log(`   ✅ 测试查询成功: ${rows[0].result}`);
        
        // 检查表是否存在
        const [tables] = await connection.query('SHOW TABLES');
        console.log(`   ✅ 数据库表数量: ${tables.length}`);
        
        if (tables.length === 0) {
            console.log('   ⚠️  警告: 数据库中没有表，需要运行迁移脚本');
            console.log('   运行: npm run migrate:up');
        } else {
            console.log('   表列表:');
            tables.forEach(table => {
                const tableName = Object.values(table)[0];
                console.log(`     - ${tableName}`);
            });
        }
        
        await connection.end();
        return true;
    } catch (error) {
        console.log('   ❌ 数据库连接失败');
        console.log(`   错误: ${error.message}`);
        console.log('');
        console.log('   解决方案:');
        console.log('   1. 确保 MySQL 服务正在运行');
        console.log('   2. 检查 .env 中的数据库配置');
        console.log('   3. 验证数据库用户名和密码');
        return false;
    }
}

// 测试 3: Redis 连接
async function testRedis() {
    console.log('');
    console.log('3. 测试 Redis 连接...');
    
    return new Promise((resolve) => {
        const client = redis.createClient({
            socket: {
                host: process.env.REDIS_HOST,
                port: parseInt(process.env.REDIS_PORT)
            }
        });
        
        client.on('error', (err) => {
            console.log('   ❌ Redis 连接失败');
            console.log(`   错误: ${err.message}`);
            console.log('');
            console.log('   解决方案:');
            console.log('   1. 确保 Redis 服务正在运行');
            console.log('   2. 在命令行运行: redis-server');
            console.log('   3. 检查 .env 中的 Redis 配置');
            resolve(false);
        });
        
        client.on('ready', async () => {
            console.log('   ✅ Redis 连接成功');
            
            try {
                // 测试 SET/GET
                await client.set('test_key', 'test_value');
                const value = await client.get('test_key');
                console.log(`   ✅ 测试读写成功: ${value}`);
                
                // 清理测试数据
                await client.del('test_key');
                
                await client.quit();
                resolve(true);
            } catch (error) {
                console.log(`   ❌ Redis 操作失败: ${error.message}`);
                await client.quit();
                resolve(false);
            }
        });
        
        client.connect().catch(() => {
            // 错误已在 'error' 事件中处理
        });
    });
}

// 运行所有测试
async function runTests() {
    const dbResult = await testDatabase();
    const redisResult = await testRedis();
    
    console.log('');
    console.log('='.repeat(60));
    console.log('测试结果');
    console.log('='.repeat(60));
    console.log(`环境变量: ${envCheckPassed ? '✅ 通过' : '❌ 失败'}`);
    console.log(`数据库连接: ${dbResult ? '✅ 通过' : '❌ 失败'}`);
    console.log(`Redis 连接: ${redisResult ? '✅ 通过' : '❌ 失败'}`);
    console.log('');
    
    if (envCheckPassed && dbResult && redisResult) {
        console.log('🎉 所有测试通过！可以启动后端服务了');
        console.log('');
        console.log('下一步:');
        console.log('1. 如果数据库没有表，运行: npm run migrate:up');
        console.log('2. 启动后端服务: npm run dev');
        console.log('3. 测试 API: curl http://localhost:3000/health');
        process.exit(0);
    } else {
        console.log('❌ 部分测试失败，请根据上面的提示解决问题');
        process.exit(1);
    }
}

runTests();

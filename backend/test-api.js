/**
 * API 端点测试脚本
 * 
 * 测试所有 REST API 端点
 */

const http = require('http');

const API_BASE_URL = 'http://localhost:3000';

console.log('='.repeat(60));
console.log('API 端点测试');
console.log('='.repeat(60));
console.log('');

// HTTP GET 请求函数
function httpGet(url) {
    return new Promise((resolve, reject) => {
        http.get(url, (res) => {
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    resolve({ status: res.statusCode, data: json });
                } catch (e) {
                    resolve({ status: res.statusCode, data: data });
                }
            });
        }).on('error', (err) => {
            reject(err);
        });
    });
}

// 测试端点列表
const tests = [
    {
        name: '健康检查',
        url: `${API_BASE_URL}/health`,
        expectedStatus: 200
    },
    {
        name: '全局统计',
        url: `${API_BASE_URL}/api/stats/global`,
        expectedStatus: 200
    },
    {
        name: '用户信息（不存在的用户）',
        url: `${API_BASE_URL}/api/user/0x0000000000000000000000000000000000000000`,
        expectedStatus: 404
    },
    {
        name: '质押历史（不存在的用户）',
        url: `${API_BASE_URL}/api/stakes/0x0000000000000000000000000000000000000000`,
        expectedStatus: 200
    },
    {
        name: '收益明细（不存在的用户）',
        url: `${API_BASE_URL}/api/rewards/0x0000000000000000000000000000000000000000`,
        expectedStatus: 200
    },
    {
        name: '推荐关系（不存在的用户）',
        url: `${API_BASE_URL}/api/referrals/0x0000000000000000000000000000000000000000`,
        expectedStatus: 200
    },
    {
        name: '节点等级历史（不存在的用户）',
        url: `${API_BASE_URL}/api/level-history/0x0000000000000000000000000000000000000000`,
        expectedStatus: 200
    }
];

// 运行测试
async function runTests() {
    let passed = 0;
    let failed = 0;
    
    console.log('开始测试...');
    console.log('');
    
    for (const test of tests) {
        try {
            console.log(`测试: ${test.name}`);
            console.log(`  URL: ${test.url}`);
            
            const result = await httpGet(test.url);
            
            if (result.status === test.expectedStatus) {
                console.log(`  ✅ 通过 (状态码: ${result.status})`);
                if (result.data) {
                    console.log(`  响应: ${JSON.stringify(result.data).substring(0, 100)}...`);
                }
                passed++;
            } else {
                console.log(`  ❌ 失败 (期望: ${test.expectedStatus}, 实际: ${result.status})`);
                failed++;
            }
        } catch (error) {
            console.log(`  ❌ 错误: ${error.message}`);
            failed++;
        }
        console.log('');
    }
    
    console.log('='.repeat(60));
    console.log('测试结果');
    console.log('='.repeat(60));
    console.log(`总计: ${tests.length}`);
    console.log(`通过: ${passed}`);
    console.log(`失败: ${failed}`);
    console.log('');
    
    if (failed === 0) {
        console.log('🎉 所有测试通过！');
        process.exit(0);
    } else {
        console.log('❌ 部分测试失败');
        console.log('');
        console.log('可能的原因:');
        console.log('1. 后端服务未启动');
        console.log('2. 数据库连接失败');
        console.log('3. Redis 连接失败');
        console.log('');
        console.log('请检查后端服务日志');
        process.exit(1);
    }
}

// 检查服务是否运行
console.log('检查后端服务是否运行...');
httpGet(`${API_BASE_URL}/health`)
    .then(() => {
        console.log('✅ 后端服务正在运行');
        console.log('');
        runTests();
    })
    .catch((error) => {
        console.log('❌ 后端服务未运行');
        console.log(`错误: ${error.message}`);
        console.log('');
        console.log('请先启动后端服务:');
        console.log('  cd backend');
        console.log('  npm run dev');
        process.exit(1);
    });

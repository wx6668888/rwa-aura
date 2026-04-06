module.exports = {
  apps: [
    {
      name: 'rwa-backend',
      cwd: '/www/wwwroot/rwaprotocol.dpdns.org/backend',
      script: 'npm',
      args: 'run server',
      // 必须 fork + 单实例：Express 只监听一个端口，cluster 多进程会 EADDRINUSE 死循环重启，定时任务永远跑不稳
      exec_mode: 'fork',
      instances: 1,
      env: {
        NODE_ENV: 'production',
        PORT: 3001
      }
    },
    {
      name: 'rwa-frontend',
      cwd: '/www/wwwroot/rwaprotocol.dpdns.org/frontend',
      script: 'npm',
      args: 'start',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      }
    },
    {
      name: 'rwa-chat-server',
      cwd: '/www/wwwroot/rwaprotocol.dpdns.org/chat-server',
      script: 'npm',
      args: 'run start',
      exec_mode: 'fork',
      instances: 1,
      env: {
        NODE_ENV: 'production',
        PORT: 3002
      }
    }
  ]
}

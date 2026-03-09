'use client'

import { useState } from 'react'
import { Database, RefreshCw, AlertCircle } from 'lucide-react'

export function DatabasePage() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-[#f1f5f9] flex items-center gap-2">
          <Database className="w-8 h-8 text-[#00f5d4]" />
          数据库管理
        </h1>
        <p className="mt-2 text-sm text-[#64748b]">查看和管理数据库记录</p>
      </div>

      <div className="rounded-xl bg-[#13131e] border border-[#ffffff0d] p-6">
        <div className="flex items-center gap-3 mb-4">
          <AlertCircle className="w-5 h-5 text-[#fb923c]" />
          <p className="text-[#fb923c]">数据库功能需要后端 API 支持</p>
        </div>
        <p className="text-sm text-[#64748b] mb-4">
          数据库管理功能需要连接后端服务。请确保：
        </p>
        <ul className="list-disc list-inside space-y-2 text-sm text-[#64748b] ml-4">
          <li>后端服务正在运行（http://localhost:3001）</li>
          <li>数据库已配置并连接</li>
          <li>EventMonitor 服务正在同步链上数据</li>
        </ul>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-xl bg-[#13131e] border border-[#ffffff0d] p-6">
          <h3 className="text-lg font-semibold text-[#f1f5f9] mb-4">数据库表</h3>
          <div className="space-y-2">
            {['users', 'stakes', 'rwa_stakes', 'rewards', 'referral_relations', 'node_level_history'].map((table) => (
              <div key={table} className="flex items-center justify-between p-3 bg-[#0d0d14] rounded-lg">
                <span className="font-mono text-sm text-[#f1f5f9]">{table}</span>
                <button className="text-xs text-[#00f5d4] hover:text-[#00d4aa] transition-colors">
                  查看
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl bg-[#13131e] border border-[#ffffff0d] p-6">
          <h3 className="text-lg font-semibold text-[#f1f5f9] mb-4">数据库操作</h3>
          <div className="space-y-2">
            <button className="w-full p-3 bg-[#0d0d14] rounded-lg text-left text-sm text-[#f1f5f9] hover:bg-[#ffffff05] transition-colors">
              同步链上数据
            </button>
            <button className="w-full p-3 bg-[#0d0d14] rounded-lg text-left text-sm text-[#f1f5f9] hover:bg-[#ffffff05] transition-colors">
              清理过期数据
            </button>
            <button className="w-full p-3 bg-[#0d0d14] rounded-lg text-left text-sm text-[#f1f5f9] hover:bg-[#ffffff05] transition-colors">
              备份数据库
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

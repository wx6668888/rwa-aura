'use client'

import { useState } from 'react'
import { Settings, Save, RefreshCw } from 'lucide-react'
import { CONTRACT_ADDRESSES } from '@/lib/contracts/addresses'

export function SettingsPage() {
  const [settings, setSettings] = useState({
    apiUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001',
    refreshInterval: 30,
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-[#f1f5f9] flex items-center gap-2">
          <Settings className="w-8 h-8 text-[#00f5d4]" />
          系统设置
        </h1>
        <p className="mt-2 text-sm text-[#64748b]">管理系统配置</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* API Settings */}
        <div className="rounded-xl bg-[#13131e] border border-[#ffffff0d] p-6">
          <h3 className="text-lg font-semibold text-[#f1f5f9] mb-4">API 设置</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-[#64748b] mb-2">后端 API 地址</label>
              <input
                type="text"
                value={settings.apiUrl}
                onChange={(e) => setSettings({ ...settings, apiUrl: e.target.value })}
                className="w-full px-4 py-2 bg-[#0d0d14] border border-[#ffffff0d] rounded-lg text-[#f1f5f9] focus:outline-none focus:ring-2 focus:ring-[#00f5d4]"
              />
            </div>
            <div>
              <label className="block text-sm text-[#64748b] mb-2">数据刷新间隔（秒）</label>
              <input
                type="number"
                value={settings.refreshInterval}
                onChange={(e) => setSettings({ ...settings, refreshInterval: Number(e.target.value) })}
                className="w-full px-4 py-2 bg-[#0d0d14] border border-[#ffffff0d] rounded-lg text-[#f1f5f9] focus:outline-none focus:ring-2 focus:ring-[#00f5d4]"
              />
            </div>
            <button className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-[#00f5d4] text-[#05050a] font-semibold rounded-lg hover:brightness-110 transition-all">
              <Save className="w-4 h-4" />
              保存设置
            </button>
          </div>
        </div>

        {/* Contract Addresses */}
        <div className="rounded-xl bg-[#13131e] border border-[#ffffff0d] p-6">
          <h3 className="text-lg font-semibold text-[#f1f5f9] mb-4">合约地址</h3>
          <div className="space-y-3">
            {Object.entries(CONTRACT_ADDRESSES[31337] || {}).map(([key, value]) => (
              <div key={key} className="p-3 bg-[#0d0d14] rounded-lg">
                <p className="text-xs text-[#64748b] mb-1">{key}</p>
                <p className="font-mono text-sm text-[#f1f5f9] break-all">{value as string}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

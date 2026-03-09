'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Lock, User, AlertCircle } from 'lucide-react'

export default function AdminLoginPage() {
  const router = useRouter()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!username.trim() || !password.trim()) {
      setError('请输入用户名和密码')
      return
    }

    setLoading(true)

    // 模拟登录验证（实际应该调用后端API）
    setTimeout(() => {
      if (username === 'rwa001' && password === 'wuxi3211') {
        // 保存登录状态
        localStorage.setItem('admin_logged_in', 'true')
        localStorage.setItem('admin_username', username)
        router.push('/admin')
      } else {
        setError('用户名或密码错误')
        setLoading(false)
      }
    }, 500)
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="bg-[#13131e] rounded-2xl border border-[#ffffff0d] p-8 shadow-2xl">
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-[#00f5d4] to-[#00d4aa] mb-4">
              <Lock className="w-8 h-8 text-[#05050a]" />
            </div>
            <h1 className="text-2xl font-bold text-[#f1f5f9] mb-2">后台管理系统</h1>
            <p className="text-sm text-[#64748b]">RWA Protocol Admin Panel</p>
          </div>

          {/* Login Form */}
          <form onSubmit={handleLogin} className="space-y-6">
            {/* Username */}
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-[#f1f5f9] mb-2">
                用户名
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-[#64748b]" />
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-[#0d0d14] border border-[#ffffff0d] rounded-lg text-[#f1f5f9] placeholder-[#64748b] focus:outline-none focus:ring-2 focus:ring-[#00f5d4] focus:border-transparent transition-all"
                  placeholder="请输入用户名"
                  autoComplete="username"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-[#f1f5f9] mb-2">
                密码
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-[#64748b]" />
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-[#0d0d14] border border-[#ffffff0d] rounded-lg text-[#f1f5f9] placeholder-[#64748b] focus:outline-none focus:ring-2 focus:ring-[#00f5d4] focus:border-transparent transition-all"
                  placeholder="请输入密码"
                  autoComplete="current-password"
                />
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="flex items-center gap-2 p-3 bg-[#fb923c10] border border-[#fb923c30] rounded-lg text-[#fb923c] text-sm">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-gradient-to-r from-[#00f5d4] to-[#00d4aa] text-[#05050a] font-semibold rounded-lg hover:brightness-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-[#00f5d4]/20"
            >
              {loading ? '登录中...' : '登录'}
            </button>
          </form>

          {/* Footer */}
          <div className="mt-6 text-center text-xs text-[#64748b]">
            <p>仅限授权管理员访问</p>
          </div>
        </div>
      </div>
    </div>
  )
}

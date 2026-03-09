'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { 
  BarChart3, Users, Coins, Award, Settings, 
  Activity, Database, Network, LogOut, Menu, X,
  TrendingUp, Wallet, FileText, Shield
} from 'lucide-react'

interface AdminLayoutProps {
  children: React.ReactNode
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [username, setUsername] = useState('')

  useEffect(() => {
    // 检查登录状态
    const isLoggedIn = localStorage.getItem('admin_logged_in')
    const adminUsername = localStorage.getItem('admin_username')
    
    if (!isLoggedIn || isLoggedIn !== 'true') {
      router.push('/admin/login')
      return
    }

    if (adminUsername) {
      setUsername(adminUsername)
    }
  }, [router])

  const handleLogout = () => {
    localStorage.removeItem('admin_logged_in')
    localStorage.removeItem('admin_username')
    router.push('/admin/login')
  }

  const menuItems = [
    { id: 'dashboard', label: '仪表盘', icon: BarChart3, path: '/admin' },
    { id: 'users', label: '用户管理', icon: Users, path: '/admin/users' },
    { id: 'staking', label: '质押管理', icon: Coins, path: '/admin/staking' },
    { id: 'rewards', label: '奖励管理', icon: Award, path: '/admin/rewards' },
    { id: 'onchain', label: '链上数据', icon: Activity, path: '/admin/onchain' },
    { id: 'transactions', label: '交易记录', icon: FileText, path: '/admin/transactions' },
    { id: 'nodes', label: '节点管理', icon: Network, path: '/admin/nodes' },
    { id: 'database', label: '数据库', icon: Database, path: '/admin/database' },
    { id: 'settings', label: '系统设置', icon: Settings, path: '/admin/settings' },
  ]

  if (pathname === '/admin/login') {
    return <>{children}</>
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f]">
      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-[#13131e] border-b border-[#ffffff0d] px-4 py-3 flex items-center justify-between">
        <h1 className="text-lg font-bold text-[#f1f5f9]">后台管理</h1>
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-2 text-[#64748b] hover:text-[#f1f5f9] transition-colors"
        >
          {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      <div className="flex">
        {/* Sidebar */}
        <aside
          className={`
            fixed lg:static top-0 left-0 h-full lg:h-screen
            w-64 bg-[#13131e] border-r border-[#ffffff0d]
            z-40 transform transition-transform duration-300 ease-in-out
            ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          `}
        >
          <div className="h-full flex flex-col">
            {/* Logo */}
            <div className="p-6 border-b border-[#ffffff0d]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#00f5d4] to-[#00d4aa] flex items-center justify-center">
                  <Shield className="w-6 h-6 text-[#05050a]" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-[#f1f5f9]">RWA Admin</h2>
                  <p className="text-xs text-[#64748b]">管理控制台</p>
                </div>
              </div>
            </div>

            {/* User Info */}
            <div className="p-4 border-b border-[#ffffff0d]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#00f5d4] flex items-center justify-center">
                  <span className="text-[#05050a] font-bold text-sm">{username.charAt(0).toUpperCase()}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[#f1f5f9] truncate">{username}</p>
                  <p className="text-xs text-[#64748b]">管理员</p>
                </div>
              </div>
            </div>

            {/* Menu */}
            <nav className="flex-1 overflow-y-auto p-4 space-y-1">
              {menuItems.map((item) => {
                const Icon = item.icon
                const isActive = pathname === item.path || (item.path === '/admin' && pathname === '/admin')
                return (
                  <a
                    key={item.id}
                    href={item.path}
                    onClick={(e) => {
                      e.preventDefault()
                      router.push(item.path)
                      setSidebarOpen(false)
                    }}
                    className={`
                      flex items-center gap-3 px-4 py-3 rounded-lg transition-all
                      ${isActive
                        ? 'bg-[#00f5d4]/10 text-[#00f5d4] border border-[#00f5d4]/20'
                        : 'text-[#64748b] hover:bg-[#ffffff05] hover:text-[#f1f5f9]'
                      }
                    `}
                  >
                    <Icon className="w-5 h-5 shrink-0" />
                    <span className="text-sm font-medium">{item.label}</span>
                  </a>
                )
              })}
            </nav>

            {/* Logout */}
            <div className="p-4 border-t border-[#ffffff0d]">
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-[#fb923c] hover:bg-[#fb923c]/10 transition-all"
              >
                <LogOut className="w-5 h-5 shrink-0" />
                <span className="text-sm font-medium">退出登录</span>
              </button>
            </div>
          </div>
        </aside>

        {/* Overlay for mobile */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-30 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Main Content */}
        <main className="flex-1 lg:ml-0 pt-16 lg:pt-0">
          <div className="p-4 lg:p-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}

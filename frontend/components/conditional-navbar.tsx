'use client'

import { usePathname } from 'next/navigation'
import { Navbar } from '@/components/navbar'

/** 顶栏挂在根布局、且排在页面内容之后，避免内页 fixed 层同 z-index 时盖住导航（首页因结构不同曾「碰巧」正常） */
export function ConditionalNavbar() {
  const pathname = usePathname() || ''
  if (pathname.startsWith('/chat')) return null
  return <Navbar />
}

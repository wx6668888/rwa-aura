import type { Metadata, Viewport } from 'next'
import { ChatViewportShell } from '@/components/chat/chat-viewport-shell'

export const metadata: Metadata = {
  title: 'Chat | RWA Aura',
  description: 'RWA Aura decentralized community chat',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'RWA Chat',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#05050a',
  viewportFit: 'cover',
}

export default function ChatLayout({ children }: { children: React.ReactNode }) {
  return <ChatViewportShell>{children}</ChatViewportShell>
}

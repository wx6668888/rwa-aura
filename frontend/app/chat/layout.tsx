import type { Metadata, Viewport } from 'next';

export const metadata: Metadata = {
  title: 'Chat | RWA Aura',
  description: 'RWA Aura decentralized community chat',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'RWA Chat',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#05050a',
};

export default function ChatLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-[100dvh] max-h-[100dvh] overflow-hidden overscroll-none bg-void-black flex flex-col min-h-0">
      {children}
    </div>
  );
}

'use client'

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { warmConnectModal } from '@/lib/wallet-connect-preconnect'
import { RwaConnectWalletModal } from '@/components/rwa-connect-wallet-modal'

type RwaConnectMenuContextValue = {
  openConnectMenu: () => void
}

const RwaConnectMenuContext = createContext<RwaConnectMenuContextValue | null>(null)

export function useRwaConnectMenu(): RwaConnectMenuContextValue {
  const v = useContext(RwaConnectMenuContext)
  if (!v) {
    throw new Error('useRwaConnectMenu must be used within RwaConnectWalletMenuProvider')
  }
  return v
}

/** 自定义「连接钱包」底部弹层（币安/TP/MetaMask… + 搜索进 WalletConnect 全量列表） */
export function RwaConnectWalletMenuProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)
  const openConnectMenu = useCallback(() => {
    warmConnectModal()
    setOpen(true)
  }, [])
  const value = useMemo(() => ({ openConnectMenu }), [openConnectMenu])
  return (
    <RwaConnectMenuContext.Provider value={value}>
      {children}
      <RwaConnectWalletModal open={open} onOpenChange={setOpen} />
    </RwaConnectMenuContext.Provider>
  )
}

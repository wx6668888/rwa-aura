'use client'

import { create } from 'zustand'

type NetworkStore = {
  lastRefreshMs: number
  touchRefresh: () => void
}

export const useNetworkStore = create<NetworkStore>((set) => ({
  lastRefreshMs: Date.now(),
  touchRefresh: () => set({ lastRefreshMs: Date.now() }),
}))

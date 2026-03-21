'use client'

import { useEffect } from 'react'
import { Capacitor } from '@capacitor/core'
import { App as CapApp } from '@capacitor/app'
import { StatusBar, Style } from '@capacitor/status-bar'

export function CapacitorNativeRuntime() {
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return

    // Keep UI consistent with dark app shell（失败不冒泡，避免未捕获 Promise）
    void StatusBar.setStyle({ style: Style.Dark }).catch(() => {})
    void StatusBar.setBackgroundColor({ color: '#0a0a0f' }).catch(() => {})

    // Native back button: if no history, exit app.
    const sub = CapApp.addListener('backButton', ({ canGoBack }) => {
      if (canGoBack) {
        window.history.back()
      } else {
        void CapApp.exitApp()
      }
    })

    return () => {
      void sub.then((s) => s.remove())
    }
  }, [])

  return null
}

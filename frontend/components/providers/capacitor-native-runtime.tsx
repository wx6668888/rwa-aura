'use client'

import { useEffect } from 'react'
import { Capacitor } from '@capacitor/core'
import { App as CapApp } from '@capacitor/app'
import { StatusBar, Style } from '@capacitor/status-bar'

export function CapacitorNativeRuntime() {
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return

    const platform = Capacitor.getPlatform()

    if (platform === 'ios') {
      // iOS：沉浸模式，隐藏状态栏，避免与 WebView 顶部重叠
      void StatusBar.setOverlaysWebView({ overlay: true }).catch(() => {})
      void StatusBar.hide().catch(() => {})
    } else {
      void StatusBar.setOverlaysWebView({ overlay: false }).catch(() => {})
      void StatusBar.setStyle({ style: Style.Dark }).catch(() => {})
      void StatusBar.setBackgroundColor({ color: '#0a0a0f' }).catch(() => {})
      void StatusBar.show().catch(() => {})
    }

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

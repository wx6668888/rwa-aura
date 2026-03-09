'use client'

import { useEffect } from 'react'

/**
 * 处理 MetaMask 等钱包扩展的 ethereum 重定义错误
 * 这个错误是正常的，因为钱包扩展会在页面加载时注入 window.ethereum
 * 而 Next.js 的热重载可能会尝试重新定义它
 */
export function EthereumErrorHandler() {
  useEffect(() => {
    if (typeof window === 'undefined') return

    // 在页面加载时立即处理，避免错误传播
    const handleError = (event: ErrorEvent) => {
      if (
        event.message &&
        (event.message.includes('Cannot redefine property: ethereum') ||
         event.message.includes('Cannot redefine property'))
      ) {
        // 静默处理，这是正常行为
        event.preventDefault()
        event.stopPropagation()
        return false
      }
    }

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const errorMessage = event.reason?.message || event.reason?.toString() || ''
      if (
        typeof errorMessage === 'string' &&
        (errorMessage.includes('Cannot redefine property: ethereum') ||
         errorMessage.includes('Cannot redefine property'))
      ) {
        // 静默处理，这是正常行为
        event.preventDefault()
        return false
      }
    }

    // 尽早添加事件监听器
    window.addEventListener('error', handleError, true) // 使用捕获阶段
    window.addEventListener('unhandledrejection', handleUnhandledRejection)

    return () => {
      window.removeEventListener('error', handleError, true)
      window.removeEventListener('unhandledrejection', handleUnhandledRejection)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return null
}

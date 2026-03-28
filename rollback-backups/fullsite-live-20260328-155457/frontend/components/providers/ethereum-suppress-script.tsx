'use client'

import { useEffect } from 'react'

/**
 * Ethereum Property Redefinition Error Suppression Script
 * 
 * 这个组件在客户端挂载时立即执行，用于抑制 MetaMask 扩展与 Next.js 热重载冲突导致的错误
 * 
 * 错误原因：
 * 1. MetaMask 扩展会在页面加载时注入 window.ethereum
 * 2. Next.js 16 + Turbopack 的热重载可能会尝试重新定义这个属性
 * 3. 这会导致 "Cannot redefine property: ethereum" 错误
 * 
 * 解决方案：
 * 在组件挂载的最早阶段拦截并静默处理这个错误
 */
export function EthereumSuppressScript() {
  useEffect(() => {
    if (typeof window === 'undefined') return

    // 保存原始的 defineProperty
    const originalDefineProperty = Object.defineProperty

    // 包装 defineProperty 以捕获 ethereum 重定义错误
    Object.defineProperty = function (obj: any, prop: string, descriptor: PropertyDescriptor) {
      // 如果是尝试定义 window.ethereum，且已经存在且不可配置
      if (prop === 'ethereum' && obj === window) {
        try {
          const existingDescriptor = Object.getOwnPropertyDescriptor(window, 'ethereum')
          
          // 如果属性已存在且不可配置，说明是 MetaMask 扩展注入的
          if (existingDescriptor && !existingDescriptor.configurable) {
            // 在开发环境中，静默忽略重定义尝试
            if (process.env.NODE_ENV === 'development') {
              // 不执行任何操作，直接返回 window 对象
              return window
            }
          }
          
          // 尝试正常定义
          return originalDefineProperty.call(this, obj, prop, descriptor)
        } catch (error: any) {
          // 捕获重定义错误，静默处理
          if (
            error &&
            (error.message?.includes('Cannot redefine property') ||
             error.toString().includes('Cannot redefine property'))
          ) {
            // `Cannot redefine property: ethereum` 在部分 WebView/打包环境下会同步抛出，
            // 这类错误不应导致整页白屏，直接静默返回 window。
            return window
          }
          // 其他错误正常抛出
          throw error
        }
      }
      
      // 对于其他属性，正常处理
      try {
        return originalDefineProperty.call(this, obj, prop, descriptor)
      } catch (error: any) {
        // 捕获其他重定义错误
        if (
          error &&
          error.message?.includes('Cannot redefine property')
        ) {
          // 其它属性的“重定义失败”也不应该导致客户端异常，直接静默返回原对象。
          return obj
        }
        throw error
      }
    }

    // 处理全局错误事件（作为备用方案）
    const handleError = (event: ErrorEvent) => {
      if (
        event.message &&
        (event.message.includes('Cannot redefine property: ethereum') ||
         event.message.includes('Cannot redefine property'))
      ) {
        // 静默处理，这是正常行为
        event.preventDefault()
        event.stopPropagation()
        event.stopImmediatePropagation()
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
        event.stopPropagation()
        return false
      }
    }

    // 在最早阶段添加事件监听器（使用捕获阶段，优先级最高）
    window.addEventListener('error', handleError, true)
    window.addEventListener('unhandledrejection', handleUnhandledRejection, true)

    // 清理函数
    return () => {
      // 恢复原始的 defineProperty
      Object.defineProperty = originalDefineProperty
      window.removeEventListener('error', handleError, true)
      window.removeEventListener('unhandledrejection', handleUnhandledRejection, true)
    }
  }, [])

  return null
}

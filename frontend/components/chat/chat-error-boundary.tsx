'use client'

import React from 'react'

/** 捕获扩展注入等导致的渲染错误（如 TronLink），避免整页白屏 */
export class ChatErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error: unknown) {
    const msg = error instanceof Error ? error.message : String(error)
    const stack = error instanceof Error ? error.stack ?? '' : ''
    if (msg.toLowerCase().includes('tronlink') || stack.includes('chrome-extension')) {
      this.setState({ hasError: false })
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center bg-void-black">
          <div className="text-center">
            <p className="mb-2 text-text-primary">发生错误</p>
            <button
              type="button"
              onClick={() => this.setState({ hasError: false })}
              className="text-sm text-plasma-cyan underline"
            >
              重试
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

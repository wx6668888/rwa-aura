'use client'

import { useEffect, useRef } from 'react'
import { useDepthData } from '@/hooks/useMarketData'

export function DepthChart() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const { buyOrders, sellOrders, currentPrice } = useDepthData()

  useEffect(() => {
    if (!canvasRef.current || buyOrders.length === 0 || sellOrders.length === 0) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    const rect = canvas.getBoundingClientRect()
    
    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr
    // 避免重复渲染时 ctx.scale 累乘导致坐标/计算异常
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.scale(dpr, dpr)

    const width = rect.width
    const height = rect.height
    const padding = 40

    // Clear canvas
    ctx.clearRect(0, 0, width, height)

    // Calculate cumulative volumes
    const buyCumulative = []
    let buySum = 0
    for (const order of buyOrders) {
      buySum += order.amount
      buyCumulative.push({ price: order.price, volume: buySum })
    }

    const sellCumulative = []
    let sellSum = 0
    for (const order of sellOrders) {
      sellSum += order.amount
      sellCumulative.push({ price: order.price, volume: sellSum })
    }

    const maxVolume = Math.max(buySum, sellSum)
    const minPrice = buyOrders[buyOrders.length - 1]?.price || currentPrice - 0.05
    const maxPrice = sellOrders[sellOrders.length - 1]?.price || currentPrice + 0.05
    const denom = maxPrice - minPrice
    if (!Number.isFinite(maxVolume) || maxVolume <= 0 || !Number.isFinite(denom) || denom === 0) return

    // Helper functions
    const xScale = (price: number) => padding + ((price - minPrice) / denom) * (width - 2 * padding)
    const yScale = (volume: number) => height - padding - ((volume / maxVolume) * (height - 2 * padding))

    // Draw buy area
    ctx.fillStyle = '#10b98120'
    ctx.strokeStyle = '#10b981'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(padding, height - padding)
    for (const point of buyCumulative.reverse()) {
      ctx.lineTo(xScale(point.price), yScale(point.volume))
    }
    ctx.lineTo(xScale(currentPrice), height - padding)
    ctx.closePath()
    ctx.fill()
    ctx.stroke()

    // Draw sell area
    ctx.fillStyle = '#f43f5e20'
    ctx.strokeStyle = '#f43f5e'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(xScale(currentPrice), height - padding)
    for (const point of sellCumulative) {
      ctx.lineTo(xScale(point.price), yScale(point.volume))
    }
    ctx.lineTo(width - padding, height - padding)
    ctx.closePath()
    ctx.fill()
    ctx.stroke()

    // Draw current price line
    ctx.strokeStyle = '#00f5d4'
    ctx.lineWidth = 2
    ctx.setLineDash([5, 5])
    ctx.beginPath()
    ctx.moveTo(xScale(currentPrice), padding)
    ctx.lineTo(xScale(currentPrice), height - padding)
    ctx.stroke()
    ctx.setLineDash([])

    // Draw current price label
    ctx.fillStyle = '#00f5d4'
    ctx.font = '12px monospace'
    ctx.textAlign = 'center'
    ctx.fillText(`$${currentPrice.toFixed(4)}`, xScale(currentPrice), padding - 10)

    // Draw axes
    ctx.strokeStyle = '#ffffff0d'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(padding, height - padding)
    ctx.lineTo(width - padding, height - padding)
    ctx.moveTo(padding, padding)
    ctx.lineTo(padding, height - padding)
    ctx.stroke()

  }, [buyOrders, sellOrders, currentPrice])

  return (
    <canvas
      ref={canvasRef}
      className="h-[400px] w-full"
      style={{ width: '100%', height: '400px' }}
    />
  )
}

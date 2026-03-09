'use client'

import { create } from 'zustand'
import { useEffect, useState } from 'react'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'

interface MarketState {
  dataSource: 'live' | 'mock'
  setDataSource: (source: 'live' | 'mock') => void
}

export const useMarketStore = create<MarketState>((set) => ({
  dataSource: 'mock',
  setDataSource: (source) => set({ dataSource: source }),
}))

export function useMarketData() {
  const { dataSource } = useMarketStore()
  const [data, setData] = useState({
    price: 0.85,
    change24h: 2.5,
    high24h: 0.89,
    low24h: 0.81,
    volume24h: 1245000,
    marketCap: 8500000,
    isLive: false,
  })

  useEffect(() => {
    if (dataSource === 'mock') {
      // 模拟价格波动
      const interval = setInterval(() => {
        setData(prev => ({
          ...prev,
          price: prev.price + (Math.random() - 0.5) * 0.001,
          change24h: prev.change24h + (Math.random() - 0.5) * 0.1,
        }))
      }, 3000)
      return () => clearInterval(interval)
    }

    const fetchData = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/market/overview`)
        const result = await response.json()
        if (result.success) {
          setData({ ...result.data, isLive: true })
        }
      } catch (error) {
        console.error('Failed to fetch market overview:', error)
      }
    }

    fetchData()
    const interval = setInterval(fetchData, 30000)
    return () => clearInterval(interval)
  }, [dataSource])

  return data
}

export function useOHLCVData(timeRange: string) {
  const { dataSource } = useMarketStore()
  const [data, setData] = useState<any[]>([])

  useEffect(() => {
    if (dataSource === 'mock') {
      // 生成模拟 K线数据
      const mockData = []
      const now = Date.now()
      let price = 0.85
      
      for (let i = 90; i >= 0; i--) {
        const timestamp = now - i * 24 * 60 * 60 * 1000
        const open = price
        const change = (Math.random() - 0.5) * 0.05
        const close = open + change
        const high = Math.max(open, close) + Math.random() * 0.02
        const low = Math.min(open, close) - Math.random() * 0.02
        const volume = 10000 + Math.random() * 50000
        
        mockData.push({
          time: Math.floor(timestamp / 1000), // Convert to seconds for lightweight-charts
          open,
          high,
          low,
          close,
          volume
        })
        
        price = close
      }
      
      setData(mockData)
      return
    }

    const fetchData = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/market/ohlcv?days=90`)
        const result = await response.json()
        if (result.success) {
          setData(result.data)
        }
      } catch (error) {
        console.error('Failed to fetch OHLCV data:', error)
      }
    }

    fetchData()
  }, [dataSource, timeRange])

  return data
}

interface DepthOrder {
  price: number
  amount: number
  total: number
}

interface DepthData {
  buyOrders: DepthOrder[]
  sellOrders: DepthOrder[]
  currentPrice: number
}

export function useDepthData() {
  const { dataSource } = useMarketStore()
  const [data, setData] = useState<DepthData>({ buyOrders: [], sellOrders: [], currentPrice: 0.85 })

  useEffect(() => {
    if (dataSource === 'mock') {
      // 生成模拟深度数据
      const buyOrders = []
      const sellOrders = []
      let price = 0.85
      
      for (let i = 0; i < 20; i++) {
        buyOrders.push({
          price: price - i * 0.001,
          amount: 1000 + Math.random() * 5000,
          total: 0
        })
        
        sellOrders.push({
          price: price + i * 0.001,
          amount: 1000 + Math.random() * 5000,
          total: 0
        })
      }
      
      setData({ buyOrders, sellOrders, currentPrice: price })
      return
    }

    const fetchData = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/market/depth`)
        const result = await response.json()
        if (result.success) {
          setData(result.data)
        }
      } catch (error) {
        console.error('Failed to fetch depth data:', error)
      }
    }

    fetchData()
    const interval = setInterval(fetchData, 10000)
    return () => clearInterval(interval)
  }, [dataSource])

  return data
}

export function useTradesData() {
  const { dataSource } = useMarketStore()
  const [trades, setTrades] = useState<any[]>([])

  useEffect(() => {
    if (dataSource === 'mock') {
      // 生成模拟交易数据
      const mockTrades = []
      const now = Date.now()
      let price = 0.85
      
      for (let i = 0; i < 15; i++) {
        price = price + (Math.random() - 0.5) * 0.01
        const amount = 100 + Math.random() * 1000
        mockTrades.push({
          id: i,
          timestamp: now - i * 60000,
          time: now - i * 60000, // Add time field
          price: price,
          amount: amount,
          total: price * amount, // Add total field
          type: Math.random() > 0.5 ? 'buy' : 'sell'
        })
      }
      
      setTrades(mockTrades)
      
      // 每3秒添加新交易
      const interval = setInterval(() => {
        setTrades(prev => {
          const newPrice = prev[0]?.price || 0.85
          const newAmount = 100 + Math.random() * 1000
          const trade = {
            id: Date.now(),
            timestamp: Date.now(),
            time: Date.now(), // Add time field
            price: newPrice + (Math.random() - 0.5) * 0.01,
            amount: newAmount,
            total: (newPrice + (Math.random() - 0.5) * 0.01) * newAmount, // Add total field
            type: Math.random() > 0.5 ? 'buy' : 'sell'
          }
          return [trade, ...prev.slice(0, 14)]
        })
      }, 3000)
      
      return () => clearInterval(interval)
    }

    const fetchData = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/market/trades?count=15`)
        const result = await response.json()
        if (result.success) {
          setTrades(result.data)
        }
      } catch (error) {
        console.error('Failed to fetch trades:', error)
      }
    }

    fetchData()
    const interval = setInterval(fetchData, 3000)
    return () => clearInterval(interval)
  }, [dataSource])

  return trades
}

'use client'

import { useEffect, useRef } from 'react'
import { createChart, ColorType } from 'lightweight-charts'
import { useOHLCVData } from '@/hooks/useMarketData'

interface Props {
  timeRange: string
}

export function CandlestickChart({ timeRange }: Props) {
  const chartContainerRef = useRef<HTMLDivElement>(null)
  const data = useOHLCVData(timeRange)

  useEffect(() => {
    if (!chartContainerRef.current || data.length === 0) return

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: '#64748b',
      },
      grid: {
        vertLines: { color: '#ffffff08' },
        horzLines: { color: '#ffffff08' },
      },
      crosshair: {
        vertLine: { color: '#00f5d440' },
        horzLine: { color: '#00f5d440' },
      },
      rightPriceScale: {
        borderColor: 'transparent',
      },
      timeScale: {
        borderColor: '#ffffff0d',
        timeVisible: true,
      },
      width: chartContainerRef.current.clientWidth,
      height: 400,
    })

    const candlestickSeries = chart.addCandlestickSeries({
      upColor: '#10b981',
      downColor: '#f43f5e',
      borderUpColor: '#10b981',
      borderDownColor: '#f43f5e',
      wickUpColor: '#10b981',
      wickDownColor: '#f43f5e',
    })

    candlestickSeries.setData(data)

    const volumeSeries = chart.addHistogramSeries({
      color: '#10b98160',
      priceFormat: {
        type: 'volume',
      },
      priceScaleId: '',
    })

    volumeSeries.priceScale().applyOptions({
      scaleMargins: {
        top: 0.8,
        bottom: 0,
      },
    })

    const volumeData = data.map((d: any) => ({
      time: d.time,
      value: d.volume,
      color: d.close >= d.open ? '#10b98160' : '#f43f5e60',
    }))

    volumeSeries.setData(volumeData)

    chart.timeScale().fitContent()

    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({ width: chartContainerRef.current.clientWidth })
      }
    }

    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      chart.remove()
    }
  }, [data])

  return <div ref={chartContainerRef} className="relative" />
}

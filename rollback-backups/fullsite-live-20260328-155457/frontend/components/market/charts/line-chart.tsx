'use client'

import { useEffect, useRef } from 'react'
import { createChart, ColorType } from 'lightweight-charts'
import { useOHLCVData } from '@/hooks/useMarketData'

interface Props {
  timeRange: string
}

export function LineChart({ timeRange }: Props) {
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

    const lineSeries = chart.addAreaSeries({
      lineColor: '#00f5d4',
      topColor: '#00f5d433',
      bottomColor: '#00f5d400',
      lineWidth: 2,
    })

    const lineData = data.map((d: any) => ({
      time: d.time,
      value: d.close,
    }))

    lineSeries.setData(lineData)
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

'use client'

import { useEffect, useRef } from 'react'
import { createChart, ColorType } from 'lightweight-charts'
import { useOHLCVData } from '@/hooks/useMarketData'

interface Props {
  timeRange: string
}

export function VolumeChart({ timeRange }: Props) {
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
      height: 300,
    })

    const volumeSeries = chart.addHistogramSeries({
      priceFormat: {
        type: 'volume',
      },
    })

    const volumeData = data.map((d: any) => ({
      time: d.time,
      value: d.volume,
      color: d.close >= d.open ? '#10b98180' : '#f43f5e80',
    }))

    volumeSeries.setData(volumeData)

    // Add 7-period MA line
    const maData = []
    for (let i = 6; i < data.length; i++) {
      const sum = data.slice(i - 6, i + 1).reduce((acc: number, d: any) => acc + d.volume, 0)
      const avg = sum / 7
      maData.push({ time: data[i].time, value: avg })
    }

    const maSeries = chart.addLineSeries({
      color: '#8b5cf6',
      lineWidth: 2,
      lineStyle: 2, // dashed
      priceScaleId: 'left',
    })

    maSeries.setData(maData)
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

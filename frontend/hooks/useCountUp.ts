'use client'

import { useEffect, useRef, useState } from 'react'

/**
 * 数值从当前展示值缓动到 target（ cubic ease-out ），用于 Hero TVL 等「滚动出现」效果。
 */
export function useCountUp(
  target: number,
  options?: { durationMs?: number; disabled?: boolean }
) {
  const durationMs = options?.durationMs ?? 1600
  const disabled = options?.disabled ?? false
  const [value, setValue] = useState(() => (disabled ? target : 0))
  const valueRef = useRef(disabled ? target : 0)
  const rafRef = useRef(0)

  useEffect(() => {
    const safeTarget = Number.isFinite(target) ? target : 0
    if (disabled) {
      setValue(safeTarget)
      valueRef.current = safeTarget
      return
    }

    const from = valueRef.current
    if (from === safeTarget) return

    const start = performance.now()
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs)
      const eased = 1 - (1 - t) ** 3
      const v = from + (safeTarget - from) * eased
      valueRef.current = v
      setValue(v)
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick)
      } else {
        valueRef.current = safeTarget
        setValue(safeTarget)
      }
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [target, durationMs, disabled])

  return value
}

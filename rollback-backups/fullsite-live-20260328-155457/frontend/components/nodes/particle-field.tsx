'use client'

import { useMemo } from 'react'

type Particle = {
  id: number
  cx: string
  cy: string
  dur: string
  dx: string
  dy: string
}

export function ParticleField() {
  const particles = useMemo<Particle[]>(() => {
    // Deterministic pseudo-random seeded values so SSR matches client
    return Array.from({ length: 60 }, (_, i) => {
      const seed = i * 137.508 // golden angle
      const cx = ((Math.sin(seed) * 0.5 + 0.5) * 100).toFixed(2)
      const cy = ((Math.cos(seed * 1.3) * 0.5 + 0.5) * 100).toFixed(2)
      const dur = (8 + (i % 7) * 1.5).toFixed(1)
      const dx = ((Math.sin(seed * 2.1) * 20) - 10).toFixed(1)
      const dy = ((Math.cos(seed * 1.7) * 20) - 10).toFixed(1)
      return { id: i, cx, cy, dur, dx, dy }
    })
  }, [])

  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden="true">
      <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
        {particles.map((p) => (
          <circle
            key={p.id}
            cx={`${p.cx}%`}
            cy={`${p.cy}%`}
            r="1"
            fill="#00f5d4"
            opacity="0.2"
          >
            <animateTransform
              attributeName="transform"
              type="translate"
              from="0 0"
              to={`${p.dx} ${p.dy}`}
              dur={`${p.dur}s`}
              repeatCount="indefinite"
              additive="sum"
            />
            <animate
              attributeName="opacity"
              values="0.2;0.08;0.2"
              dur={`${p.dur}s`}
              repeatCount="indefinite"
            />
          </circle>
        ))}
      </svg>
    </div>
  )
}

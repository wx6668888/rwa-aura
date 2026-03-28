export function HexNetwork() {
  return (
    <div className="relative flex h-full w-full items-center justify-center">
      <svg viewBox="0 0 400 400" className="h-full w-full max-w-md" fill="none">
        <defs>
          <linearGradient id="lineGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#00f5d4" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#00f5d4" stopOpacity="0" />
          </linearGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Connecting lines */}
        {[
          { x1: 200, y1: 200, x2: 100, y2: 80 },
          { x1: 200, y1: 200, x2: 320, y2: 80 },
          { x1: 200, y1: 200, x2: 80, y2: 320 },
          { x1: 200, y1: 200, x2: 320, y2: 300 },
        ].map((line, i) => (
          <line
            key={i}
            x1={line.x1}
            y1={line.y1}
            x2={line.x2}
            y2={line.y2}
            stroke="url(#lineGrad)"
            strokeWidth="1.5"
            strokeDasharray="6 4"
            className="animate-dash-flow"
            style={{ animationDelay: `${i * 0.3}s` }}
          />
        ))}

        {/* Center hex node */}
        <g filter="url(#glow)" className="animate-pulse-node" style={{ transformOrigin: '200px 200px' }}>
          <polygon
            points="200,165 230,182 230,218 200,235 170,218 170,182"
            fill="#05050a"
            stroke="#00f5d4"
            strokeWidth="2"
          />
          <text x="200" y="205" textAnchor="middle" fill="#00f5d4" fontSize="14" fontFamily="var(--font-space-grotesk)">
            RWA
          </text>
        </g>

        {/* Outer nodes */}
        {[
          { cx: 100, cy: 80 },
          { cx: 320, cy: 80 },
          { cx: 80, cy: 320 },
          { cx: 320, cy: 300 },
        ].map((node, i) => (
          <g
            key={i}
            className="animate-pulse-node"
            style={{ transformOrigin: `${node.cx}px ${node.cy}px`, animationDelay: `${i * 0.7}s` }}
          >
            <polygon
              points={hexPoints(node.cx, node.cy, 22)}
              fill="#05050a"
              stroke="#f59e0b"
              strokeWidth="1.5"
            />
          </g>
        ))}
      </svg>
    </div>
  )
}

function hexPoints(cx: number, cy: number, r: number): string {
  return Array.from({ length: 6 }, (_, i) => {
    const angle = (Math.PI / 3) * i - Math.PI / 2
    return `${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`
  }).join(' ')
}

interface BackgroundEffectsProps {
  opacity?: number
}

export function BackgroundEffects({ opacity = 12 }: BackgroundEffectsProps) {
  const cyanOpacity = opacity / 100
  const purpleOpacity = (opacity - 2) / 100

  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      {/* Cyan orb top-right */}
      <div
        className="absolute -top-40 end-[-200px] h-[600px] w-[600px] rounded-full blur-[180px]"
        style={{ background: 'radial-gradient(circle, #00f5d4 0%, transparent 70%)', opacity: cyanOpacity }}
      />
      {/* Purple orb bottom-left */}
      <div
        className="absolute -bottom-60 start-[-300px] h-[800px] w-[800px] rounded-full blur-[220px]"
        style={{ background: 'radial-gradient(circle, #8b5cf6 0%, transparent 70%)', opacity: purpleOpacity }}
      />
      {/* Grain overlay */}
      <svg className="absolute inset-0 h-full w-full opacity-[0.04]">
        <filter id="grain">
          <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch" />
        </filter>
        <rect width="100%" height="100%" filter="url(#grain)" />
      </svg>
      {/* Grid lines */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `
            linear-gradient(to right, #ffffff05 1px, transparent 1px),
            linear-gradient(to bottom, #ffffff05 1px, transparent 1px)
          `,
          backgroundSize: '80px 80px',
          maskImage: 'linear-gradient(to bottom, transparent, black 20%, black 60%, transparent)',
          WebkitMaskImage: 'linear-gradient(to bottom, transparent, black 20%, black 60%, transparent)',
        }}
      />
    </div>
  )
}

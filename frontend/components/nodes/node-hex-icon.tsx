'use client'

import { NodeLevelConfig } from '@/lib/node-levels'
import { useState } from 'react'

interface NodeHexIconProps {
  config: NodeLevelConfig
  size?: number
  showCode?: boolean
  className?: string
  isInteractive?: boolean
  isUnlocked?: boolean
  onClick?: () => void
}

// ─────────────────────────────────────────────
// Global CSS animations — injected once into <head>
// ─────────────────────────────────────────────
const GLOBAL_STYLES = `
  @keyframes nhi-l2-burst  { 0%,100%{opacity:.35} 50%{opacity:1} }
  @keyframes nhi-l3-ray    { 0%,100%{opacity:.28} 50%{opacity:1} }
  @keyframes nhi-l4-hover  { 0%,100%{transform:translateY(0px)} 50%{transform:translateY(-2.5px)} }
  @keyframes nhi-l4-rim    { 0%,100%{opacity:.12} 50%{opacity:1} }
  @keyframes nhi-l4-beam   { 0%,100%{opacity:.06} 50%{opacity:.2} }
  @keyframes nhi-l5-drift  { 0%,100%{transform:translate(0px,0px)} 50%{transform:translate(2.5px,-2px)} }
  @keyframes nhi-l6-atm    { 0%,100%{opacity:.32} 50%{opacity:.72} }
  @keyframes nhi-l6-ring   { 0%,100%{stroke-opacity:.5} 50%{stroke-opacity:.95} }
  @keyframes nhi-l7-spin   { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
  @keyframes nhi-l7-corona { 0%,100%{opacity:.12} 50%{opacity:.42} }
  @keyframes nhi-l8-spin   { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
  @keyframes nhi-l8-core   { 0%,100%{opacity:.85} 50%{opacity:1} }
  @keyframes nhi-l9-spin   { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
  @keyframes nhi-l9-bulge  { 0%,100%{opacity:.85} 50%{opacity:1} }
  @keyframes nhi-hex-blink { 0%,100%{stroke-opacity:.35} 50%{stroke-opacity:.88} }
  @keyframes nhi-lock-pulse{ 0%,100%{opacity:.75;transform:scale(1)} 50%{opacity:1;transform:scale(1.1)} }
`

let _stylesInjected = false
function injectStyles() {
  if (_stylesInjected || typeof document === 'undefined') return
  const el = document.createElement('style')
  el.textContent = GLOBAL_STYLES
  document.head.appendChild(el)
  _stylesInjected = true
}

// ─────────────────────────────────────────────
// Per-level SVG icon renderers
// viewBox: 0 0 80 80  |  hex: M40,5 L70,22 L70,58 L40,75 L10,58 L10,22 Z
// ─────────────────────────────────────────────
const HEX = 'M40,5 L70,22 L70,58 L40,75 L10,58 L10,22 Z'

type Renderer = (a: string) => JSX.Element

const RENDERERS: Renderer[] = [

  // ── L1 QUANTUM — Bohr atom, 3 orbital ellipses, 3 SVG-animated electrons
  (a) => (
    <>
      <path d={HEX} fill={`${a}09`} stroke={a} strokeWidth="1.2" strokeOpacity=".3" />
      <line x1="40" y1="16" x2="40" y2="64" stroke={a} strokeWidth=".5" strokeOpacity=".18" />
      <line x1="12" y1="40" x2="68" y2="40" stroke={a} strokeWidth=".5" strokeOpacity=".18" />
      <ellipse cx="40" cy="40" rx="20" ry="6" fill="none" stroke={a} strokeWidth=".8" strokeOpacity=".45" strokeDasharray="3 2" />
      <ellipse cx="40" cy="40" rx="20" ry="6" transform="rotate(60,40,40)"  fill="none" stroke={a} strokeWidth=".8" strokeOpacity=".45" strokeDasharray="3 2" />
      <ellipse cx="40" cy="40" rx="20" ry="6" transform="rotate(120,40,40)" fill="none" stroke={a} strokeWidth=".8" strokeOpacity=".45" strokeDasharray="3 2" />
      <circle cx="40" cy="40" r="5"   fill={a} opacity=".9" />
      <circle cx="37.5" cy="38" r="2" fill="#94a3b8" opacity=".55" />
      <circle cx="42"   cy="42" r="1.5" fill="#94a3b8" opacity=".35" />
      <circle r="2.5" fill="#94a3b8">
        <animateMotion dur="3.6s" repeatCount="indefinite" path="M60,40 A20,6,0,0,1,20,40 A20,6,0,0,1,60,40" />
      </circle>
      <circle r="2" fill="#64748b" opacity=".8">
        <animateMotion dur="5.1s" repeatCount="indefinite" path="M50,57.3 A20,6,60,0,1,30,22.7 A20,6,60,0,1,50,57.3" />
      </circle>
      <circle r="2" fill="#64748b" opacity=".6">
        <animateMotion dur="4.3s" repeatCount="indefinite" path="M30,57.3 A20,6,120,0,1,50,22.7 A20,6,120,0,1,30,57.3" />
      </circle>
    </>
  ),

  // ── L2 PARTICLE — cyclotron ring accelerator, 2 counter-orbiting particles
  (a) => (
    <>
      <path d={HEX} fill={`${a}0a`} stroke={a} strokeWidth="1.2" strokeOpacity=".35" />
      <circle cx="40" cy="40" r="23" fill="none" stroke={a} strokeWidth="1.5" strokeOpacity=".3" />
      <path d="M63,40 A23,23,0,0,1,51.5,59.9" fill="none" stroke={a} strokeWidth="3.5" strokeOpacity=".72" strokeLinecap="round" />
      <path d="M28.5,59.9 A23,23,0,0,1,17,40"  fill="none" stroke={a} strokeWidth="3.5" strokeOpacity=".72" strokeLinecap="round" />
      <path d="M17,40 A23,23,0,0,1,28.5,20.1"  fill="none" stroke={a} strokeWidth="3.5" strokeOpacity=".72" strokeLinecap="round" />
      <circle cx="40" cy="40" r="18" fill="none" stroke={a} strokeWidth=".5" strokeOpacity=".18" strokeDasharray="2 3" />
      <line x1="40" y1="17" x2="40" y2="31" stroke={a} strokeWidth=".6" strokeOpacity=".28" strokeDasharray="2 2" />
      <line x1="40" y1="49" x2="40" y2="63" stroke={a} strokeWidth=".6" strokeOpacity=".28" strokeDasharray="2 2" />
      <circle cx="40" cy="40" r="6"   fill="none" stroke={a} strokeWidth="1" strokeOpacity=".55" />
      <circle cx="40" cy="40" r="3.5" fill={a} style={{ animation: 'nhi-l2-burst 1.4s ease-in-out infinite' }} />
      <circle r="3.5" fill="#7dd3fc">
        <animateMotion dur="2.8s" repeatCount="indefinite" path="M63,40 A23,23,0,0,1,17,40 A23,23,0,0,1,63,40" />
      </circle>
      <circle r="3.5" fill="#0891b2">
        <animateMotion dur="2.8s" repeatCount="indefinite" begin="1.4s" path="M17,40 A23,23,0,0,0,63,40 A23,23,0,0,0,17,40" />
      </circle>
    </>
  ),

  // ── L3 PHOTON — glass prism, single beam in, 5-ray dispersion fan
  (a) => (
    <>
      <path d={HEX} fill={`${a}0a`} stroke={a} strokeWidth="1.2" strokeOpacity=".4" />
      <polygon points="20,20 20,60 58,40" fill={`${a}06`} stroke={a} strokeWidth="1.5" strokeLinejoin="round" />
      <line x1="30" y1="22" x2="38" y2="58" stroke={a} strokeWidth=".4" strokeOpacity=".14" />
      <line x1="40" y1="26" x2="46" y2="55" stroke={a} strokeWidth=".4" strokeOpacity=".11" />
      <line x1="6"  y1="40" x2="20" y2="40" stroke={a} strokeWidth="2.5" strokeLinecap="round" strokeOpacity=".95" />
      <circle cx="20" cy="40" r="2.5" fill={a} opacity=".9" />
      <circle cx="57" cy="40" r="3"   fill={a} opacity=".9" />
      {(['0s','.35s','.7s','1.05s','1.4s'] as const).map((delay, i) => {
        const ys = [20, 29, 38, 49, 58]
        return (
          <line key={i} x1="56" y1="40" x2="72" y2={ys[i]}
            stroke={a} strokeWidth="1.6" strokeLinecap="round"
            style={{ animation: `nhi-l3-ray 2.2s ease-in-out ${delay} infinite` }} />
        )
      })}
    </>
  ),

  // ── L4 STARSHIP — UFO saucer, dome, cockpit, cycling rim lights, scan beam
  (a) => (
    <>
      <path d={HEX} fill={`${a}0a`} stroke={a} strokeWidth="1.2" strokeOpacity=".38" />
      <g style={{ animation: 'nhi-l4-hover 2.8s ease-in-out infinite' }}>
        <path d="M28,54 L40,72 L52,54 Z" fill={a} style={{ animation: 'nhi-l4-beam 2s ease-in-out infinite' }} />
        <line x1="34" y1="54" x2="30" y2="70" stroke={a} strokeWidth=".6" strokeOpacity=".5" style={{ animation: 'nhi-l4-beam 2s ease-in-out infinite' }} />
        <line x1="40" y1="54" x2="40" y2="72" stroke={a} strokeWidth=".6" strokeOpacity=".5" style={{ animation: 'nhi-l4-beam 2s ease-in-out infinite' }} />
        <line x1="46" y1="54" x2="50" y2="70" stroke={a} strokeWidth=".6" strokeOpacity=".5" style={{ animation: 'nhi-l4-beam 2s ease-in-out infinite' }} />
        <ellipse cx="40" cy="52" rx="13" ry="3.5" fill={a} opacity=".18" />
        <ellipse cx="40" cy="52" rx="7"  ry="2"   fill={a} opacity=".15" />
        <ellipse cx="40" cy="46" rx="26" ry="9" fill={`${a}12`} stroke={a} strokeWidth="1.5" />
        <path d="M14,46 Q40,37 66,46" fill="none" stroke={a} strokeWidth=".8" strokeOpacity=".5" />
        <path d="M27,46 Q27,31 40,29 Q53,31 53,46 Z" fill={`${a}15`} stroke={a} strokeWidth="1" />
        <path d="M30,40 Q40,29 50,40" fill="none" stroke={a} strokeWidth=".6" strokeOpacity=".38" />
        <circle cx="40" cy="36" r="4.5" fill="#05050a" />
        <circle cx="40" cy="36" r="4.5" fill="none" stroke={a} strokeWidth=".9" />
        <circle cx="40" cy="36" r="2.2" fill={a} opacity=".65" />
        {(['19,46,0s','27,39.5,.23s','53,39.5,.46s','61,46,.7s','51,52,.93s','29,52,1.16s'] as const).map((spec, i) => {
          const [cx, cy, delay] = spec.split(',')
          return <circle key={i} cx={cx} cy={cy} r="2.2" fill={a}
            style={{ animation: `nhi-l4-rim 1.4s ease-in-out ${delay} infinite` }} />
        })}
      </g>
    </>
  ),

  // ── L5 COMET — nucleus + coma + layered dust/ion tail, drifting
  (a) => (
    <>
      <path d={HEX} fill={`${a}0a`} stroke={a} strokeWidth="1.2" strokeOpacity=".42" />
      <g style={{ animation: 'nhi-l5-drift 4s ease-in-out infinite' }}>
        <line x1="32" y1="32" x2="66" y2="66" stroke={a} strokeWidth=".8" strokeOpacity=".26" />
        <path d="M32,32 Q52,46 70,62" fill="none" stroke={a} strokeWidth="9"   strokeOpacity=".05" strokeLinecap="round" />
        <path d="M32,32 Q50,44 67,59" fill="none" stroke={a} strokeWidth="6"   strokeOpacity=".09" strokeLinecap="round" />
        <path d="M32,32 Q49,43 64,56" fill="none" stroke={a} strokeWidth="3.5" strokeOpacity=".16" strokeLinecap="round" />
        <path d="M32,32 Q48,42 61,53" fill="none" stroke={a} strokeWidth="1.8" strokeOpacity=".34" strokeLinecap="round" />
        {([[39,37,2.5,.68],[45,41,2.1,.52],[51,45,1.8,.37],[56,49,1.4,.24],[61,53,1.1,.14],[65,57,.8,.08]] as [number,number,number,number][])
          .map(([cx,cy,r,op],i) => <circle key={i} cx={cx} cy={cy} r={r} fill={a} opacity={op} />)}
        <circle cx="28" cy="27" r="12" fill={`${a}08`} />
        <circle cx="28" cy="27" r="9"  fill={`${a}10`} />
        <circle cx="28" cy="27" r="5.5" fill={a} opacity=".88" />
        <circle cx="26" cy="25" r="2.2" fill="#a5b4fc" opacity=".6" />
        <circle cx="28" cy="27" r="2.8" fill="#e0e7ff" opacity=".75" />
      </g>
    </>
  ),

  // ── L6 PLANET — Saturn with front/back ring z-layering, atmosphere bands
  (a) => (
    <>
      <path d={HEX} fill={`${a}0c`} stroke={a} strokeWidth="1.3" strokeOpacity=".48" />
      <path d="M12,40 A28,9,0,0,0,68,40"  fill="none" stroke={a} strokeWidth="3.5" strokeOpacity=".28" />
      <path d="M10,40 A30,10,0,0,0,70,40" fill="none" stroke={a} strokeWidth=".8"  strokeOpacity=".16" />
      <circle cx="40" cy="40" r="17" fill={`${a}18`} />
      <circle cx="40" cy="40" r="17" fill="none" stroke={a} strokeWidth="1.6" />
      {(['M23,35 Q40,31 57,35','M24,40 Q40,36.5 56,40','M25,45.5 Q40,43 55,45.5'] as const).map((d,i) => (
        <path key={i} d={d} fill="none" stroke={a} strokeWidth={i===0?.9:.7}
          style={{ animation: `nhi-l6-atm 4s ease-in-out ${i*.6}s infinite` }} />
      ))}
      <circle cx="40" cy="26" r="3" fill="none" stroke={a} strokeWidth=".6" strokeOpacity=".5" />
      <path d="M12,40 A28,9,0,0,1,68,40"  fill="none" stroke={a} strokeWidth="3.5"
        style={{ animation: 'nhi-l6-ring 3.5s ease-in-out infinite' }} />
      <path d="M10,40 A30,10,0,0,1,70,40" fill="none" stroke={a} strokeWidth=".8" strokeOpacity=".26" />
      <path d="M16,40 A24,8,0,0,1,64,40"  fill="none" stroke="#c4b5fd" strokeWidth=".6" strokeOpacity=".22" />
      <path d="M26,40 A14,3.5,0,0,1,54,40" fill="none" stroke="#1a0a2e" strokeWidth="2.5" strokeOpacity=".5" />
    </>
  ),

  // ── L7 STAR — 8-point radiant star, slow rotation, dual corona rings
  (a) => (
    <>
      <path d={HEX} fill={`${a}0e`} stroke={a} strokeWidth="1.4" strokeOpacity=".55"
        style={{ animation: 'nhi-hex-blink 2.5s ease-in-out infinite' }} />
      <circle cx="40" cy="40" r="27" fill="none" stroke={a} strokeWidth=".5" strokeOpacity=".12" strokeDasharray="2 3"
        style={{ animation: 'nhi-l7-corona 3.5s ease-in-out 1.75s infinite' }} />
      <circle cx="40" cy="40" r="24" fill="none" stroke={a} strokeWidth=".7" strokeOpacity=".2"
        style={{ animation: 'nhi-l7-corona 3.5s ease-in-out infinite' }} />
      <polygon
        points="40,18 42.7,33.5 50.6,29.4 46.5,37.3 62,40 46.5,42.7 50.6,50.6 42.7,46.5 40,62 37.3,46.5 29.4,50.6 33.5,42.7 18,40 33.5,37.3 29.4,29.4 37.3,33.5"
        fill={a} opacity=".88"
        style={{ animation: 'nhi-l7-spin 28s linear infinite', transformOrigin: '40px 40px' }} />
      <circle cx="40" cy="40" r="7.5" fill="#05050a" />
      <circle cx="40" cy="40" r="5.5" fill={a} opacity=".95" />
      <circle cx="38" cy="38" r="2"   fill="#e9d5ff" opacity=".6" />
    </>
  ),

  // ── L8 NEBULA — 4-arm spiral nebula rotating, star-forming knots, blazing core
  (a) => (
    <>
      <path d={HEX} fill={`${a}12`} stroke={a} strokeWidth="1.8" strokeOpacity=".78"
        style={{ animation: 'nhi-hex-blink 2.5s ease-in-out infinite' }} />
      <circle cx="40" cy="40" r="25" fill={`${a}05`} />
      <g style={{ animation: 'nhi-l8-spin 22s linear infinite', transformOrigin: '40px 40px' }}>
        <path d="M40,40 Q46,28 58,20 Q64,15 67,11" fill="none" stroke={a} strokeWidth="3.5" strokeOpacity=".52" strokeLinecap="round" />
        <path d="M40,40 Q45,29 55,22"               fill="none" stroke={a} strokeWidth="6"   strokeOpacity=".18" strokeLinecap="round" />
        <path d="M40,40 Q34,52 22,60 Q16,65 13,69" fill="none" stroke={a} strokeWidth="3.5" strokeOpacity=".52" strokeLinecap="round" />
        <path d="M40,40 Q35,51 25,58"               fill="none" stroke={a} strokeWidth="6"   strokeOpacity=".18" strokeLinecap="round" />
        <path d="M40,40 Q54,38 63,48 Q68,56 67,63" fill="none" stroke={a} strokeWidth="2.5" strokeOpacity=".4"  strokeLinecap="round" />
        <path d="M40,40 Q26,42 17,32 Q12,24 13,17" fill="none" stroke={a} strokeWidth="2.5" strokeOpacity=".4"  strokeLinecap="round" />
        {([[52,27,3,.82],[22,56,3,.78],[61,51,2.2,.65],[17,26,2.2,.6],[64,18,1.4,.55],[13,62,1.4,.5],[65,62,1.1,.4],[14,18,1.1,.4]] as [number,number,number,number][])
          .map(([cx,cy,r,op],i) => <circle key={i} cx={cx} cy={cy} r={r} fill={i<4?'#fbbf24':a} opacity={op} />)}
      </g>
      <circle cx="40" cy="40" r="11" fill={`${a}18`} />
      <circle cx="40" cy="40" r="8"  fill={a} opacity=".9" style={{ animation: 'nhi-l8-core 2s ease-in-out infinite' }} />
      <circle cx="40" cy="40" r="5"  fill="#fde68a" opacity=".85" />
      <circle cx="40" cy="40" r="3"  fill="#fffbeb" opacity=".75" />
    </>
  ),

  // ── L9 COSMOS — spiral galaxy, 2 counter-arms, star clusters, galactic bulge
  (a) => (
    <>
      <path d={HEX} fill={`${a}16`} stroke={a} strokeWidth="2.2" strokeOpacity=".92"
        style={{ animation: 'nhi-hex-blink 2.5s ease-in-out infinite' }} />
      {([[18,12,.42],[64,16,.48],[11,58,.35],[68,62,.38]] as [number,number,number][])
        .map(([cx,cy,op],i) => <circle key={i} cx={cx} cy={cy} r="1.2" fill={a} opacity={op} />)}
      <g style={{ animation: 'nhi-l9-spin 28s linear infinite', transformOrigin: '40px 40px' }}>
        <circle cx="40" cy="40" r="27" fill={`${a}07`} />
        <circle cx="40" cy="40" r="22" fill={`${a}09`} />
        <path d="M40,40 Q44,29 52,21 Q60,14 66,9"  fill="none" stroke={a} strokeWidth="4" strokeOpacity=".55" strokeLinecap="round" />
        <path d="M40,40 Q34,38 26,30 Q19,22 14,15"  fill="none" stroke={a} strokeWidth="3" strokeOpacity=".4"  strokeLinecap="round" />
        <path d="M66,9  Q72,6 74,12 Q72,20 62,24"   fill="none" stroke={a} strokeWidth="2" strokeOpacity=".28" strokeLinecap="round" />
        <path d="M40,40 Q36,51 28,59 Q20,67 14,71"  fill="none" stroke={a} strokeWidth="4" strokeOpacity=".55" strokeLinecap="round" />
        <path d="M40,40 Q46,42 54,50 Q61,58 66,65"  fill="none" stroke={a} strokeWidth="3" strokeOpacity=".4"  strokeLinecap="round" />
        <path d="M14,71 Q8,74 6,68 Q8,60 18,56"    fill="none" stroke={a} strokeWidth="2" strokeOpacity=".28" strokeLinecap="round" />
        {([[53,24,2.8,.82],[24,24,2.5,.75],[27,56,2.8,.82],[56,56,2.5,.75],[64,15,1.8,.62],[15,18,1.8,.6],[16,65,1.8,.62],[65,62,1.8,.6],[70,35,1.2,.45],[10,45,1.2,.45]] as [number,number,number,number][])
          .map(([cx,cy,r,op],i) => <circle key={i} cx={cx} cy={cy} r={r} fill={a} opacity={op} />)}
      </g>
      <circle cx="40" cy="40" r="11" fill={`${a}20`} />
      <circle cx="40" cy="40" r="8"  fill={a} opacity=".9" style={{ animation: 'nhi-l9-bulge 2.5s ease-in-out infinite' }} />
      <circle cx="40" cy="40" r="5.5" fill="#fffbeb" opacity=".88" />
      <circle cx="40" cy="40" r="3.5" fill="white"   opacity=".72" />
    </>
  ),
]

// ─────────────────────────────────────────────
// NodeHexIcon — main export, drop-in replacement
// ─────────────────────────────────────────────
export function NodeHexIcon({
  config,
  size = 64,
  showCode = true,
  className = '',
  isInteractive = false,
  isUnlocked = true,
  onClick,
}: NodeHexIconProps) {
  injectStyles()
  const [hovered, setHovered] = useState(false)

  const idx      = Math.min(Math.max(config.level - 1, 0), 8)
  const accent   = config.color
  const glowSize = config.level >= 7 ? config.level * 2 : 0

  return (
    <div
      className={[
        'relative flex flex-col items-center gap-1',
        isInteractive ? 'cursor-pointer' : '',
        !isUnlocked  ? 'opacity-40'      : '',
        className,
      ].join(' ')}
      style={{
        width: size,
        transform: hovered && isInteractive ? 'scale(1.08)' : undefined,
        transition: 'transform 0.25s ease',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onClick}
    >
      {/* ── SVG Icon ── */}
      <svg
        viewBox="0 0 80 80"
        width={size}
        height={size}
        xmlns="http://www.w3.org/2000/svg"
        style={{
          overflow: 'visible',
          filter: isUnlocked && glowSize > 0
            ? `drop-shadow(0 0 ${glowSize}px ${accent}70)`
            : undefined,
          transition: 'filter 0.3s ease',
        }}
      >
        {RENDERERS[idx](accent)}
      </svg>

      {/* ── Level code ── */}
      {showCode && (
        <span style={{
          fontFamily:    "'JetBrains Mono', monospace",
          fontSize:      Math.max(size * 0.16, 9),
          fontWeight:    700,
          letterSpacing: '0.06em',
          color:         accent,
          opacity:       isUnlocked ? 0.9 : 0.4,
          lineHeight:    1,
        }}>
          {config.code}
        </span>
      )}

      {/* Lock overlay removed on nodes page (per product decision) */}
    </div>
  )
}

// ─────────────────────────────────────────────
// MiniNodeHexIcon — compact variant for tables / lists
// ─────────────────────────────────────────────
export function MiniNodeHexIcon({
  config,
  size = 24,
}: {
  config: NodeLevelConfig
  size?: number
}) {
  injectStyles()
  const idx = Math.min(Math.max(config.level - 1, 0), 8)
  return (
    <svg
      viewBox="0 0 80 80"
      width={size}
      height={size}
      xmlns="http://www.w3.org/2000/svg"
      style={{ overflow: 'visible', display: 'block' }}
    >
      {RENDERERS[idx](config.color)}
    </svg>
  )
}

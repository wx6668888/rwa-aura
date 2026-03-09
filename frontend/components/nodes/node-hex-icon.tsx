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

/**
 * 节点等级图标组件（纯emoji，无边框）
 * - 只显示emoji表情
 * - 轻微动效（级别越高越明显）
 */
export function NodeHexIcon({ 
  config, 
  size = 64, 
  showCode = true,
  className = '',
  isInteractive = false,
  isUnlocked = true,
  onClick
}: NodeHexIconProps) {
  const [isHovered, setIsHovered] = useState(false)

  // 根据等级计算动效强度（轻微动效）
  const getAnimationIntensity = () => {
    if (config.level <= 1) return { float: 3, pulse: 1.0 }
    if (config.level <= 3) return { float: 2.5, pulse: 1.02 }
    if (config.level <= 5) return { float: 2, pulse: 1.03 }
    if (config.level <= 7) return { float: 1.5, pulse: 1.05 }
    return { float: 1.2, pulse: 1.08 } // L8-L9
  }

  const intensity = getAnimationIntensity()
  const emojiSize = size * 0.7 // emoji尺寸

  return (
    <div 
      className={`relative flex items-center justify-center ${className} ${isInteractive ? 'cursor-pointer' : ''} ${!isUnlocked ? 'opacity-50' : ''}`}
      style={{ 
        width: size, 
        height: size,
        transform: isHovered && isInteractive ? 'scale(1.1)' : undefined,
        transition: 'transform 0.3s ease'
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onClick}
    >
      {/* emoji图标 - 轻微动效 */}
      <div 
        className="flex items-center justify-center"
        style={{ 
          fontSize: emojiSize,
          lineHeight: 1,
          width: emojiSize,
          height: emojiSize,
          // 轻微动效：浮动 + 轻微脉冲
          animation: `node-emoji-float ${intensity.float}s ease-in-out infinite, node-emoji-pulse ${4 - config.level * 0.2}s ease-in-out infinite`
        }}
      >
        {config.emoji}
      </div>

      {/* 等级代码（可选，显示在下方） */}
      {showCode && (
        <div 
          className="absolute bottom-0 left-1/2 -translate-x-1/2"
          style={{
            fontSize: size * 0.2,
            color: config.color,
            fontWeight: 700,
            fontFamily: "'Space Grotesk', sans-serif",
            opacity: 0.8
          }}
        >
          {config.code}
        </div>
      )}

      {/* 锁定图标（未解锁时显示在顶部） */}
      {!isUnlocked && (
        <div 
          className="absolute -top-1 left-1/2 -translate-x-1/2 z-10"
        >
          <svg 
            width={size * 0.3} 
            height={size * 0.3} 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="#f43f5e" 
            strokeWidth="2.5" 
            strokeLinecap="round" 
            strokeLinejoin="round"
            style={{
              filter: 'drop-shadow(0 0 4px #f43f5e)',
              animation: 'node-lock-pulse 2s ease-in-out infinite'
            }}
          >
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        </div>
      )}

      {/* CSS动画定义 */}
      <style jsx>{`
        @keyframes node-emoji-float {
          0%, 100% { 
            transform: translateY(0);
          }
          50% { 
            transform: translateY(-${config.level * 0.3}px);
          }
        }
        
        @keyframes node-emoji-pulse {
          0%, 100% { 
            transform: scale(1);
            opacity: 1;
          }
          50% { 
            transform: scale(${intensity.pulse});
            opacity: 0.95;
          }
        }
        
        @keyframes node-lock-pulse {
          0%, 100% { 
            opacity: 0.8;
            transform: scale(1);
          }
          50% { 
            opacity: 1;
            transform: scale(1.1);
          }
        }
      `}</style>
    </div>
  )
}

/**
 * 小型图标（用于表格等）
 */
export function MiniNodeHexIcon({ 
  config, 
  size = 24 
}: { config: NodeLevelConfig; size?: number }) {
  const emojiSize = size * 0.8

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <div 
        className="flex items-center justify-center"
        style={{ 
          fontSize: emojiSize, 
          lineHeight: 1,
          width: emojiSize,
          height: emojiSize,
          animation: config.level >= 4 ? `node-emoji-float ${2 - config.level * 0.1}s ease-in-out infinite` : undefined
        }}
      >
        {config.emoji}
      </div>
    </div>
  )
}

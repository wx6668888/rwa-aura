'use client'

export function ShimmerBlock({ className = '' }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-md bg-gradient-to-r from-[#13131e] via-[#1a1a2a] to-[#13131e] ${className}`}
    />
  )
}

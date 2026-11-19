import React from 'react'

/** The editor's mark: a serif "K" in oxblood. Stands in for an AI avatar. */
export function Monogram({ size = 24, className = '' }: { size?: number; className?: string }) {
  return (
    <span
      className={`font-serif leading-none text-[var(--accent-primary)] select-none ${className}`}
      style={{ fontSize: size, fontWeight: 500 }}
      aria-hidden
    >
      K
    </span>
  )
}

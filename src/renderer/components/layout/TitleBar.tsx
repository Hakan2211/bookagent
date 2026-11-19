import React from 'react'
import { Feather } from 'lucide-react'

const isMac = navigator.userAgent.includes('Mac')

interface TitleBarProps {
  /** Content placed after the wordmark (e.g. book title). */
  children?: React.ReactNode
  /** Content on the right, kept clear of the native caption buttons. */
  right?: React.ReactNode
}

/**
 * 40px draggable title bar. On Windows/Linux the native min/max/close buttons
 * are drawn over the right ~140px (titleBarOverlay); on macOS the traffic
 * lights sit on the left.
 */
export function TitleBar({ children, right }: TitleBarProps) {
  return (
    <div
      className="h-10 shrink-0 flex items-center gap-3 select-none"
      style={
        {
          WebkitAppRegion: 'drag',
          paddingLeft: isMac ? 84 : 16,
          paddingRight: isMac ? 12 : 150
        } as React.CSSProperties
      }
    >
      <div className="flex items-center gap-2 shrink-0">
        <Feather size={16} strokeWidth={1.5} className="text-[var(--accent-primary)]" />
        <span className="font-serif text-[16px] text-[var(--text-primary)]">Kitapmi</span>
      </div>
      <div className="min-w-0 flex-1 flex items-center gap-3">{children}</div>
      {right && (
        <div className="flex items-center gap-1" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
          {right}
        </div>
      )}
    </div>
  )
}

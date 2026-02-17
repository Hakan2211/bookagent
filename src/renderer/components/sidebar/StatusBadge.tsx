import React from 'react'
import type { ChapterStatus } from '@shared/types'

interface StatusBadgeProps {
  status: ChapterStatus
}

const statusConfig: Record<ChapterStatus, { color: string; bg: string }> = {
  outline: { color: 'var(--status-outline)', bg: 'rgba(148, 163, 184, 0.15)' },
  draft: { color: 'var(--status-draft)', bg: 'rgba(251, 191, 36, 0.15)' },
  revised: { color: 'var(--status-revised)', bg: 'rgba(96, 165, 250, 0.15)' },
  final: { color: 'var(--status-final)', bg: 'rgba(52, 211, 153, 0.15)' }
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const config = statusConfig[status]

  return (
    <span
      className="w-2 h-2 rounded-full shrink-0"
      style={{
        backgroundColor: config.color,
        boxShadow: `0 0 6px ${config.bg}`
      }}
      title={status}
    />
  )
}

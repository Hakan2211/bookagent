import React from 'react'
import type { ChapterStatus } from '@shared/types'

interface StatusBadgeProps {
  status: ChapterStatus
}

const statusConfig: Record<ChapterStatus, { color: string; symbol: string }> = {
  outline: { color: 'var(--status-outline)', symbol: '○' },
  draft: { color: 'var(--status-draft)', symbol: '◐' },
  revised: { color: 'var(--status-revised)', symbol: '◑' },
  final: { color: 'var(--status-final)', symbol: '●' }
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const config = statusConfig[status]

  return (
    <span
      className="text-xs leading-none shrink-0"
      style={{ color: config.color }}
      title={status}
    >
      {config.symbol}
    </span>
  )
}

import React from 'react'
import { useTranslation } from 'react-i18next'
import type { ChapterStatus } from '@shared/types'

interface StatusBadgeProps {
  status: ChapterStatus
  /** Show the status name next to the dot. */
  label?: boolean
}

export function StatusBadge({ status, label = false }: StatusBadgeProps) {
  const { t } = useTranslation('editor')
  const name = t(('editor:status' + status.charAt(0).toUpperCase() + status.slice(1)) as any)
  return (
    <span className="inline-flex items-center gap-1.5 shrink-0" title={name}>
      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: `var(--status-${status})` }} />
      {label && <span className="text-[12px] text-[var(--text-tertiary)]">{name}</span>}
    </span>
  )
}

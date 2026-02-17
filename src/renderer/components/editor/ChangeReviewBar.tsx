import React from 'react'
import { useEditorStore } from '../../stores/editorStore'
import { Button } from '../common/Button'
import { GitCompare } from 'lucide-react'

export function ChangeReviewBar() {
  const pendingDiff = useEditorStore((s) => s.pendingDiff)
  const acceptAllChanges = useEditorStore((s) => s.acceptAllChanges)
  const rejectAllChanges = useEditorStore((s) => s.rejectAllChanges)

  if (!pendingDiff) return null

  const changeCount = pendingDiff.changeGroups.length

  return (
    <div
      className="flex items-center justify-between px-6 py-2.5 border-b border-[var(--border-active)] shrink-0"
      style={{ background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.08) 0%, rgba(167, 139, 250, 0.05) 100%)' }}
    >
      <div className="flex items-center gap-3">
        <GitCompare size={14} className="text-[var(--text-accent)]" />
        <span className="text-sm font-semibold text-[var(--text-primary)] tracking-tight">
          Review Mode
        </span>
        <span className="text-xs text-[var(--text-secondary)] font-medium">
          {changeCount} change{changeCount !== 1 ? 's' : ''} proposed
        </span>
        {pendingDiff.description && (
          <span className="text-xs text-[var(--text-tertiary)] italic">
            — {pendingDiff.description}
          </span>
        )}
      </div>

      <div className="flex items-center gap-2">
        <Button variant="primary" size="sm" onClick={acceptAllChanges}>
          Accept All
        </Button>
        <Button variant="danger" size="sm" onClick={rejectAllChanges}>
          Reject All
        </Button>
      </div>
    </div>
  )
}

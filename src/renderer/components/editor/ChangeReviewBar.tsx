import React from 'react'
import { useEditorStore } from '../../stores/editorStore'
import { Button } from '../common/Button'

export function ChangeReviewBar() {
  const pendingDiff = useEditorStore((s) => s.pendingDiff)
  const acceptAllChanges = useEditorStore((s) => s.acceptAllChanges)
  const rejectAllChanges = useEditorStore((s) => s.rejectAllChanges)

  if (!pendingDiff) return null

  const changeCount = pendingDiff.changeGroups.length

  return (
    <div className="flex items-center justify-between px-4 py-2 bg-[var(--bg-active)] border-b border-[var(--border-active)] shrink-0">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-[var(--text-primary)]">
          REVIEW MODE
        </span>
        <span className="text-xs text-[var(--text-secondary)]">
          {changeCount} change{changeCount !== 1 ? 's' : ''} proposed
        </span>
        {pendingDiff.description && (
          <span className="text-xs text-[var(--text-secondary)] italic">
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

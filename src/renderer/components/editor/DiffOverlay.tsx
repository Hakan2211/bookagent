import React from 'react'
import type { ChangeGroup } from '@shared/types'

interface DiffOverlayProps {
  changeGroups: ChangeGroup[]
  acceptedGroupIds: Set<string>
  onAccept: (groupId: string) => void
  onReject: (groupId: string) => void
}

export function DiffOverlay({
  changeGroups,
  acceptedGroupIds,
  onAccept,
  onReject
}: DiffOverlayProps) {
  return (
    <div className="p-4 space-y-3">
      {changeGroups.map((group) => {
        const isAccepted = acceptedGroupIds.has(group.id)
        return (
          <div
            key={group.id}
            className={`p-2 rounded border ${
              isAccepted
                ? 'border-emerald-600/30 bg-emerald-600/10'
                : 'border-[var(--border)] bg-[var(--bg-input)]'
            }`}
          >
            <div className="text-sm font-mono">
              {group.changes.map((change) => (
                <span
                  key={change.id}
                  className={
                    change.type === 'insert'
                      ? 'diff-insert'
                      : change.type === 'delete'
                      ? 'diff-delete'
                      : ''
                  }
                >
                  {change.text}
                </span>
              ))}
            </div>
            <div className="flex gap-1 mt-2">
              <button
                onClick={() => onAccept(group.id)}
                className="text-xs px-2 py-0.5 rounded bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30"
              >
                Accept
              </button>
              <button
                onClick={() => onReject(group.id)}
                className="text-xs px-2 py-0.5 rounded bg-red-600/20 text-red-400 hover:bg-red-600/30"
              >
                Reject
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}

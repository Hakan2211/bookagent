import React from 'react'
import type { ChangeGroup } from '@shared/types'
import { Check, X } from 'lucide-react'

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
    <div className="p-5 space-y-3 max-w-4xl mx-auto">
      {changeGroups.map((group) => {
        const isAccepted = acceptedGroupIds.has(group.id)
        return (
          <div
            key={group.id}
            className={`p-3.5 rounded-xl border transition-all ${
              isAccepted
                ? 'border-emerald-500/20 bg-emerald-500/5'
                : 'border-[var(--border)] bg-[var(--bg-input)]'
            }`}
            style={{ boxShadow: 'var(--shadow-xs)' }}
          >
            <div className="text-sm font-mono leading-relaxed">
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
            <div className="flex gap-1.5 mt-3">
              <button
                onClick={() => onAccept(group.id)}
                className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-md bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 transition-all font-medium"
              >
                <Check size={12} />
                Accept
              </button>
              <button
                onClick={() => onReject(group.id)}
                className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-md bg-red-500/15 text-red-400 hover:bg-red-500/25 transition-all font-medium"
              >
                <X size={12} />
                Reject
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}

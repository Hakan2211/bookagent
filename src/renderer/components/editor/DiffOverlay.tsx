import React from 'react'
import { useTranslation } from 'react-i18next'
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
  const { t } = useTranslation('common')
  return (
    <div className="p-5 space-y-3 max-w-4xl mx-auto">
      {changeGroups.map((group) => {
        const isAccepted = acceptedGroupIds.has(group.id)
        return (
          <div
            key={group.id}
            className={`rounded-xl border-l-[3px] border transition-all ${
              isAccepted
                ? 'border-l-emerald-500 border-emerald-500/20 bg-emerald-500/5'
                : 'border-l-red-500 border-red-500/20 bg-red-500/5'
            }`}
            style={{ boxShadow: 'var(--shadow-xs)' }}
          >
            <div
              className={`p-3.5 text-sm font-mono leading-relaxed transition-opacity ${
                isAccepted ? 'opacity-100' : 'opacity-40'
              }`}
            >
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
            <div className="flex gap-1.5 px-3.5 pb-3">
              <button
                onClick={() => onAccept(group.id)}
                className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-md transition-all font-medium ${
                  isAccepted
                    ? 'bg-emerald-500 text-white shadow-sm'
                    : 'bg-emerald-500/10 text-emerald-400/50 hover:bg-emerald-500/20 hover:text-emerald-400'
                }`}
              >
                <Check size={12} />
                {t('common:accept')}
              </button>
              <button
                onClick={() => onReject(group.id)}
                className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-md transition-all font-medium ${
                  !isAccepted
                    ? 'bg-red-500 text-white shadow-sm'
                    : 'bg-red-500/10 text-red-400/50 hover:bg-red-500/20 hover:text-red-400'
                }`}
              >
                <X size={12} />
                {t('common:reject')}
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}

import React, { useState } from 'react'
import type { ChapterMeta } from '@shared/types'
import { StatusBadge } from './StatusBadge'
import { formatWordCount } from '../../lib/formatters'
import { IPC } from '@shared/ipc-channels'
import { useProjectStore } from '../../stores/projectStore'
import { Trash2 } from 'lucide-react'

interface ChapterItemProps {
  chapter: ChapterMeta
  index: number
  isActive: boolean
  onClick: () => void
}

export function ChapterItem({ chapter, index, isActive, onClick }: ChapterItemProps) {
  const [showContextMenu, setShowContextMenu] = useState(false)
  const refreshManifest = useProjectStore((s) => s.refreshManifest)

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault()
    setShowContextMenu(true)
  }

  const handleDelete = async () => {
    setShowContextMenu(false)
    if (confirm(`Delete "${chapter.title}"? This cannot be undone.`)) {
      await window.api.invoke(IPC.CHAPTER_DELETE, { chapterId: chapter.id })
      await refreshManifest()
    }
  }

  return (
    <div className="relative">
      <button
        onClick={onClick}
        onContextMenu={handleContextMenu}
        className={`w-full text-left px-6 py-3.5 flex items-center gap-3 text-[15px] transition-all ${
          isActive
            ? 'bg-[var(--bg-active)] text-[var(--text-primary)] border-l-4 border-l-[var(--text-accent)] shadow-[inset_0_0_0_1px_var(--border-subtle)]'
            : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] border-l-4 border-l-transparent'
        }`}
      >
        <span className="text-[12px] text-[var(--text-secondary)]/80 w-6 text-right shrink-0 tabular-nums font-medium">
          {String(index + 1).padStart(2, '0')}
        </span>
        <StatusBadge status={chapter.status} />
        <span className="truncate flex-1">{chapter.title}</span>
        <span className="text-[12px] text-[var(--text-tertiary)] shrink-0 tabular-nums">
          {formatWordCount(chapter.wordCount)}
        </span>
      </button>

      {/* Simple context menu */}
      {showContextMenu && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowContextMenu(false)}
          />
          <div
            className="absolute right-2 top-full z-50 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-xl py-1.5 min-w-[160px]"
            style={{ boxShadow: 'var(--shadow-lg)', animation: 'slide-up 100ms ease-out' }}
          >
            <button
              onClick={handleDelete}
              className="w-full text-left px-4 py-2.5 text-[14px] text-[var(--color-error)] hover:bg-[var(--bg-hover)] flex items-center gap-2.5"
            >
              <Trash2 size={14} />
              Delete
            </button>
          </div>
        </>
      )}
    </div>
  )
}

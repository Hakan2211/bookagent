import React, { useState } from 'react'
import type { ChapterMeta } from '@shared/types'
import { StatusBadge } from './StatusBadge'
import { formatWordCount } from '../../lib/formatters'
import { IPC } from '@shared/ipc-channels'
import { useProjectStore } from '../../stores/projectStore'

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
        className={`w-full text-left px-3 py-1.5 flex items-center gap-2 text-sm transition-colors ${
          isActive
            ? 'bg-[var(--bg-active)] text-[var(--text-primary)]'
            : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]'
        }`}
      >
        <span className="text-[10px] text-[var(--text-secondary)] w-5 text-right shrink-0">
          {String(index + 1).padStart(2, '0')}
        </span>
        <StatusBadge status={chapter.status} />
        <span className="truncate flex-1">{chapter.title}</span>
        <span className="text-[10px] text-[var(--text-secondary)] shrink-0">
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
          <div className="absolute right-2 top-full z-50 bg-[var(--bg-input)] border border-[var(--border)] rounded-md shadow-lg py-1 min-w-[120px]">
            <button
              onClick={handleDelete}
              className="w-full text-left px-3 py-1.5 text-sm text-red-400 hover:bg-[var(--bg-hover)]"
            >
              Delete
            </button>
          </div>
        </>
      )}
    </div>
  )
}

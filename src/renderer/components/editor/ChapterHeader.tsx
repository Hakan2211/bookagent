import React, { useState } from 'react'
import { useEditorStore } from '../../stores/editorStore'
import { useProjectStore } from '../../stores/projectStore'
import { IPC } from '@shared/ipc-channels'
import { Dropdown } from '../common/Dropdown'
import type { ChapterStatus } from '@shared/types'

export function ChapterHeader() {
  const activeChapterId = useEditorStore((s) => s.activeChapterId)
  const manifest = useProjectStore((s) => s.manifest)
  const refreshManifest = useProjectStore((s) => s.refreshManifest)

  const chapter = manifest?.chapters.find((ch) => ch.id === activeChapterId)
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [editTitle, setEditTitle] = useState('')

  if (!chapter) return null

  const handleRename = async () => {
    if (editTitle.trim() && editTitle !== chapter.title) {
      await window.api.invoke(IPC.CHAPTER_RENAME, {
        chapterId: chapter.id,
        newTitle: editTitle.trim()
      })
      await refreshManifest()
    }
    setIsEditingTitle(false)
  }

  const handleStatusChange = async (value: string) => {
    await window.api.invoke(IPC.CHAPTER_UPDATE_STATUS, {
      chapterId: chapter.id,
      status: value as ChapterStatus
    })
    await refreshManifest()
  }

  return (
    <div className="px-8 py-4 border-b border-[var(--border)] bg-[var(--bg-editor)] shrink-0">
      <div className="flex items-center justify-between max-w-4xl mx-auto">
        <div className="flex items-center gap-4">
          {isEditingTitle ? (
            <input
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              onBlur={handleRename}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleRename()
                if (e.key === 'Escape') setIsEditingTitle(false)
              }}
              autoFocus
              className="text-xl font-semibold bg-transparent border-b-2 border-[var(--border-active)] outline-none text-[var(--text-primary)] px-0 tracking-tight"
            />
          ) : (
            <h1
              className="text-xl font-semibold text-[var(--text-primary)] cursor-pointer hover:text-[var(--text-accent-hover)] transition-colors tracking-tight"
              onClick={() => {
                setEditTitle(chapter.title)
                setIsEditingTitle(true)
              }}
            >
              {chapter.title}
            </h1>
          )}

          <span className="text-xs text-[var(--text-tertiary)] tabular-nums font-medium">
            {chapter.wordCount.toLocaleString()} words
          </span>
        </div>

        <Dropdown
          options={[
            { value: 'outline', label: 'Outline' },
            { value: 'draft', label: 'Draft' },
            { value: 'revised', label: 'Revised' },
            { value: 'final', label: 'Final' }
          ]}
          value={chapter.status}
          onChange={handleStatusChange}
          className="w-28"
        />
      </div>
    </div>
  )
}

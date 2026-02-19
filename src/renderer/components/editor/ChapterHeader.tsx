import React, { useState } from 'react'
import { useEditorStore } from '../../stores/editorStore'
import { useProjectStore } from '../../stores/projectStore'
import { IPC } from '@shared/ipc-channels'
import { Dropdown } from '../common/Dropdown'
import type { ChapterStatus } from '@shared/types'
import { ChevronRight } from 'lucide-react'

export function ChapterHeader() {
  const activeChapterId = useEditorStore((s) => s.activeChapterId)
  const activeSectionId = useEditorStore((s) => s.activeSectionId)
  const openChapter = useEditorStore((s) => s.openChapter)
  const manifest = useProjectStore((s) => s.manifest)
  const refreshManifest = useProjectStore((s) => s.refreshManifest)

  const chapter = manifest?.chapters.find((ch) => ch.id === activeChapterId)
  const section = activeSectionId
    ? chapter?.sections?.find((s) => s.id === activeSectionId)
    : null

  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [editTitle, setEditTitle] = useState('')

  if (!chapter) return null

  // Active item is the section if viewing a section, otherwise the chapter
  const activeTitle = section ? section.title : chapter.title
  const activeStatus = section ? section.status : chapter.status
  const activeWordCount = section ? section.wordCount : chapter.wordCount

  const handleRename = async () => {
    const newTitle = editTitle.trim()
    if (!newTitle || newTitle === activeTitle) {
      setIsEditingTitle(false)
      return
    }

    if (section && activeSectionId) {
      await window.api.invoke(IPC.SECTION_RENAME, {
        chapterId: chapter.id,
        sectionId: activeSectionId,
        newTitle
      })
    } else {
      await window.api.invoke(IPC.CHAPTER_RENAME, {
        chapterId: chapter.id,
        newTitle
      })
    }
    await refreshManifest()
    setIsEditingTitle(false)
  }

  const handleStatusChange = async (value: string) => {
    if (section && activeSectionId) {
      await window.api.invoke(IPC.SECTION_UPDATE_STATUS, {
        chapterId: chapter.id,
        sectionId: activeSectionId,
        status: value as ChapterStatus
      })
    } else {
      await window.api.invoke(IPC.CHAPTER_UPDATE_STATUS, {
        chapterId: chapter.id,
        status: value as ChapterStatus
      })
    }
    await refreshManifest()
  }

  return (
    <div className="px-10 py-5 border-b border-[var(--border)] bg-[var(--bg-editor)] shrink-0">
      <div className="flex items-center justify-between max-w-4xl mx-auto">
        <div className="flex items-center gap-4">
          {/* Breadcrumb: Chapter > Section */}
          <div className="flex items-center gap-2">
            {section ? (
              <>
                <button
                  onClick={() => openChapter(chapter.id)}
                  className="text-[15px] text-[var(--text-secondary)] hover:text-[var(--text-accent)] transition-colors truncate max-w-[200px]"
                >
                  {chapter.title}
                </button>
                <ChevronRight size={14} className="text-[var(--text-tertiary)] shrink-0" />
              </>
            ) : null}

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
                className="text-2xl font-semibold bg-transparent border-b-2 border-[var(--border-active)] outline-none text-[var(--text-primary)] px-0 tracking-tight"
              />
            ) : (
              <h1
                className="text-2xl font-semibold text-[var(--text-primary)] cursor-pointer hover:text-[var(--text-accent-hover)] transition-colors tracking-tight"
                onClick={() => {
                  setEditTitle(activeTitle)
                  setIsEditingTitle(true)
                }}
              >
                {activeTitle}
              </h1>
            )}
          </div>

          <span className="text-[13px] text-[var(--text-tertiary)] tabular-nums font-medium">
            {activeWordCount.toLocaleString()} words
          </span>
        </div>

        <Dropdown
          options={[
            { value: 'outline', label: 'Outline' },
            { value: 'draft', label: 'Draft' },
            { value: 'revised', label: 'Revised' },
            { value: 'final', label: 'Final' }
          ]}
          value={activeStatus}
          onChange={handleStatusChange}
          className="w-32"
        />
      </div>
    </div>
  )
}

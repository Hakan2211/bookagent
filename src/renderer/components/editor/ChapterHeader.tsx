import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useEditorStore } from '../../stores/editorStore'
import { useProjectStore } from '../../stores/projectStore'
import { IPC } from '@shared/ipc-channels'
import type { ChapterStatus } from '@shared/types'

export function ChapterHeader() {
  const { t } = useTranslation(['common', 'editor'])
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
  const [statusOpen, setStatusOpen] = useState(false)

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

  const statuses: ChapterStatus[] = ['outline', 'draft', 'revised', 'final']

  return (
    <div className="mb-9 pt-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-[13px] text-[var(--text-tertiary)] font-serif min-w-0">
        <span className="truncate max-w-[220px]">{manifest?.title}</span>
        <span>/</span>
        {section ? (
          <>
            <button
              onClick={() => openChapter(chapter.id)}
              className="truncate max-w-[220px] hover:text-[var(--text-primary)]"
            >
              {chapter.title}
            </button>
            <span>/</span>
            <span className="truncate text-[var(--text-secondary)]">{section.title}</span>
          </>
        ) : (
          <span className="truncate text-[var(--text-secondary)]">{chapter.title}</span>
        )}
      </div>

      {/* Title (click to rename) */}
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
          className="mt-3 w-full font-serif text-[42px] leading-[1.15] bg-transparent border-b border-[var(--border-active)] outline-none text-[var(--text-primary)]"
        />
      ) : (
        <h1
          className="mt-3 font-serif text-[42px] leading-[1.15] text-[var(--text-primary)] cursor-text tracking-[-0.01em]"
          title={t('editor:clickToRename')}
          onClick={() => {
            setEditTitle(activeTitle)
            setIsEditingTitle(true)
          }}
        >
          {activeTitle}
        </h1>
      )}

      {/* Status + word count */}
      <div className="mt-4 flex items-center gap-4">
        <div className="relative">
          <button
            onClick={() => setStatusOpen((o) => !o)}
            className="inline-flex items-center gap-2 h-8 pl-3 pr-3.5 rounded-full border border-[var(--border-strong)] font-serif text-[14px] text-[var(--text-primary)] hover:bg-[var(--bg-hover)]"
          >
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: `var(--status-${activeStatus})` }} />
            {t(('editor:status' + activeStatus.charAt(0).toUpperCase() + activeStatus.slice(1)) as any)}
          </button>
          {statusOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setStatusOpen(false)} />
              <div className="absolute left-0 top-10 z-50 min-w-[160px] py-1 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg-elevated)] shadow-[var(--shadow-md)]">
                {statuses.map((st) => (
                  <button
                    key={st}
                    onClick={() => {
                      setStatusOpen(false)
                      handleStatusChange(st)
                    }}
                    className={`w-full flex items-center gap-2.5 px-3.5 py-2 text-left font-serif text-[14px] hover:bg-[var(--bg-hover)] ${
                      st === activeStatus ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'
                    }`}
                  >
                    <span className="w-2 h-2 rounded-full" style={{ background: `var(--status-${st})` }} />
                    {t(('editor:status' + st.charAt(0).toUpperCase() + st.slice(1)) as any)}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
        <span className="font-serif text-[14.5px] text-[var(--text-secondary)] tabular">
          {activeWordCount.toLocaleString()} {t('common:words')}
        </span>
      </div>
    </div>
  )
}

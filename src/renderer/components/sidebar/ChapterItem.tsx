import React, { useState, useEffect, useRef } from 'react'
import type { ChapterMeta } from '@shared/types'
import { StatusBadge } from './StatusBadge'
import { SectionItem } from './SectionItem'
import { formatWordCount } from '../../lib/formatters'
import { IPC } from '@shared/ipc-channels'
import { useProjectStore } from '../../stores/projectStore'
import { useEditorStore } from '../../stores/editorStore'
import { Trash2, ChevronRight, Plus, Pencil } from 'lucide-react'

interface ChapterItemProps {
  chapter: ChapterMeta
  index: number
  isActive: boolean
  onClick: () => void
}

export function ChapterItem({ chapter, index, isActive, onClick }: ChapterItemProps) {
  const [showContextMenu, setShowContextMenu] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const [isRenaming, setIsRenaming] = useState(false)
  const [renameValue, setRenameValue] = useState('')
  const renameInputRef = useRef<HTMLInputElement>(null)
  const refreshManifest = useProjectStore((s) => s.refreshManifest)
  const activeSectionId = useEditorStore((s) => s.activeSectionId)
  const activeChapterId = useEditorStore((s) => s.activeChapterId)
  const openSection = useEditorStore((s) => s.openSection)

  const hasSections = chapter.sections && chapter.sections.length > 0
  const isChapterContext = activeChapterId === chapter.id

  // Auto-expand when a child section becomes active (but don't prevent manual collapse)
  useEffect(() => {
    if (isChapterContext && activeSectionId != null && hasSections) {
      setIsExpanded(true)
    }
  }, [isChapterContext, activeSectionId, hasSections])

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault()
    setShowContextMenu(true)
  }

  const handleDelete = async () => {
    setShowContextMenu(false)
    const confirmed = await window.api.invoke(IPC.DIALOG_CONFIRM, {
      message: `Delete "${chapter.title}"? This cannot be undone.`,
      title: 'Delete Chapter',
      confirmLabel: 'Delete'
    })
    if (!confirmed) return

    const wasActive = useEditorStore.getState().activeChapterId === chapter.id
    await window.api.invoke(IPC.CHAPTER_DELETE, { chapterId: chapter.id })
    await refreshManifest()
    if (wasActive) {
      useEditorStore.getState().reset()
    }
  }

  const handleAddSection = async (e: React.MouseEvent) => {
    e.stopPropagation()
    setShowContextMenu(false)
    try {
      // If not yet sectioned, convert first
      if (!chapter.sections || chapter.sections.length === 0) {
        await window.api.invoke(IPC.CHAPTER_CONVERT_TO_SECTIONED, {
          chapterId: chapter.id,
          firstSectionTitle: chapter.title
        })
      }
      // Then create a new section
      await window.api.invoke(IPC.SECTION_CREATE, {
        chapterId: chapter.id,
        title: 'New Section',
        content: ''
      })
      await refreshManifest()
      setIsExpanded(true)
    } catch (err) {
      console.error('Failed to add section:', err)
    }
  }

  const handleChevronClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    setIsExpanded(!isExpanded)
  }

  // ── Inline rename ──────────────────────────
  const startRename = () => {
    setShowContextMenu(false)
    setRenameValue(chapter.title)
    setIsRenaming(true)
  }

  const commitRename = async () => {
    const newTitle = renameValue.trim()
    setIsRenaming(false)
    if (!newTitle || newTitle === chapter.title) return

    await window.api.invoke(IPC.CHAPTER_RENAME, {
      chapterId: chapter.id,
      newTitle
    })
    await refreshManifest()
  }

  const handleRenameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      commitRename()
    }
    if (e.key === 'Escape') {
      setIsRenaming(false)
    }
  }

  // Focus the rename input when it appears
  useEffect(() => {
    if (isRenaming && renameInputRef.current) {
      renameInputRef.current.focus()
      renameInputRef.current.select()
    }
  }, [isRenaming])

  // Total word count for sectioned chapters = sum of section word counts
  const totalWords = hasSections
    ? chapter.sections!.reduce((sum, s) => sum + s.wordCount, 0)
    : chapter.wordCount

  return (
    <div className="relative">
      {/* Chapter row */}
      <div className="group">
        <div
          className={`w-full flex items-center gap-3 text-[15px] transition-all ${
            isActive && !activeSectionId
              ? 'bg-[var(--bg-active)] text-[var(--text-primary)] border-l-4 border-l-[var(--text-accent)] shadow-[inset_0_0_0_1px_var(--border-subtle)]'
              : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] border-l-4 border-l-transparent'
          }`}
        >
          {/* Expand/collapse chevron */}
          <button
            onClick={hasSections ? handleChevronClick : undefined}
            className={`shrink-0 ml-2 p-0.5 rounded transition-all ${
              hasSections
                ? 'text-[var(--text-tertiary)] hover:text-[var(--text-primary)] cursor-pointer'
                : 'text-transparent cursor-default'
            }`}
          >
            <ChevronRight
              size={14}
              className={`transition-transform duration-150 ${isExpanded && hasSections ? 'rotate-90' : ''}`}
            />
          </button>

          <button
            onClick={onClick}
            onContextMenu={handleContextMenu}
            onDoubleClick={(e) => {
              e.preventDefault()
              startRename()
            }}
            className="flex-1 min-w-0 text-left pr-6 py-3.5 flex items-center gap-3"
          >
            <span className="text-[12px] text-[var(--text-secondary)]/80 w-6 text-right shrink-0 tabular-nums font-medium">
              {String(index + 1).padStart(2, '0')}
            </span>
            <StatusBadge status={chapter.status} />
            {isRenaming ? (
              <input
                ref={renameInputRef}
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                onBlur={commitRename}
                onKeyDown={handleRenameKeyDown}
                onClick={(e) => e.stopPropagation()}
                className="flex-1 min-w-0 bg-[var(--bg-input)] border border-[var(--border-active)] rounded-md px-2 py-0.5 text-[15px] text-[var(--text-primary)] outline-none"
              />
            ) : (
              <span className="truncate flex-1">{chapter.title}</span>
            )}
            {!isRenaming && (
              <span className="text-[12px] text-[var(--text-tertiary)] shrink-0 tabular-nums group-hover:hidden">
                {formatWordCount(totalWords)}
              </span>
            )}
          </button>

          {/* Add section button */}
          <button
            onClick={handleAddSection}
            className="shrink-0 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 text-[var(--text-tertiary)] hover:text-[var(--text-accent)] hover:bg-[var(--bg-hover)] transition-all"
            title="Add section"
          >
            <Plus size={14} />
          </button>

          {/* Delete button */}
          <button
            onClick={handleDelete}
            className="shrink-0 mr-3 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 text-[var(--text-tertiary)] hover:text-[var(--color-error)] hover:bg-[var(--bg-hover)] transition-all"
            title="Delete chapter"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* Sections (expandable) */}
      {hasSections && isExpanded && (
        <div className="border-l border-[var(--border-subtle)] ml-8">
          {chapter.sections!.map((section, sIdx) => (
            <SectionItem
              key={section.id}
              chapterId={chapter.id}
              section={section}
              index={sIdx}
              isActive={isChapterContext && activeSectionId === section.id}
              onClick={() => openSection(chapter.id, section.id)}
            />
          ))}
        </div>
      )}

      {/* Context menu (right-click) */}
      {showContextMenu && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowContextMenu(false)}
          />
          <div
            className="absolute right-2 top-12 z-50 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-xl py-1.5 min-w-[160px]"
            style={{ boxShadow: 'var(--shadow-lg)', animation: 'slide-up 100ms ease-out' }}
          >
            <button
              onClick={startRename}
              className="w-full text-left px-4 py-2.5 text-[14px] text-[var(--text-primary)] hover:bg-[var(--bg-hover)] flex items-center gap-2.5"
            >
              <Pencil size={14} />
              Rename
            </button>
            <button
              onClick={handleAddSection}
              className="w-full text-left px-4 py-2.5 text-[14px] text-[var(--text-primary)] hover:bg-[var(--bg-hover)] flex items-center gap-2.5"
            >
              <Plus size={14} />
              Add Section
            </button>
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

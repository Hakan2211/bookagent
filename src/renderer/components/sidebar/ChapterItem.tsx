import React, { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import type { ChapterMeta } from '@shared/types'
import { StatusBadge } from './StatusBadge'
import { SectionItem } from './SectionItem'
import { formatWordCount } from '../../lib/formatters'
import { IPC } from '@shared/ipc-channels'
import { useProjectStore } from '../../stores/projectStore'
import { useEditorStore } from '../../stores/editorStore'
import { useChatStore } from '../../stores/chatStore'
import { Trash2, ChevronRight, Plus, Pencil } from 'lucide-react'

interface ChapterItemProps {
  chapter: ChapterMeta
  index: number
  isActive: boolean
  onClick: () => void
}

export function ChapterItem({ chapter, index, isActive, onClick }: ChapterItemProps) {
  const { t } = useTranslation(['sidebar', 'common'])
  const [showContextMenu, setShowContextMenu] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const [isRenaming, setIsRenaming] = useState(false)
  const [renameValue, setRenameValue] = useState('')
  const renameInputRef = useRef<HTMLInputElement>(null)
  const refreshManifest = useProjectStore((s) => s.refreshManifest)
  const activeSectionId = useEditorStore((s) => s.activeSectionId)
  const activeChapterId = useEditorStore((s) => s.activeChapterId)
  const openSection = useEditorStore((s) => s.openSection)

  // Check if this chapter (or any of its sections) has pending agent changes
  const pendingActions = useChatStore((s) => s.pendingActions)
  const hasPendingChanges = pendingActions.some(
    (a) =>
      ('chapterId' in a && a.chapterId === chapter.id) ||
      ('firstChapterId' in a && a.firstChapterId === chapter.id) ||
      ('secondChapterId' in a && a.secondChapterId === chapter.id)
  )

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
      message: t('sidebar:deleteChapterConfirm', { title: chapter.title }),
      title: t('sidebar:deleteChapterTitle'),
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
        title: t('sidebar:newSection'),
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
      <div
        className={`group relative flex items-center gap-1.5 pl-3 pr-3 mx-2 rounded-[var(--radius-sm)] transition-colors ${
          isActive && !activeSectionId
            ? 'bg-[var(--bg-active)] text-[var(--text-primary)]'
            : isActive
              ? 'text-[var(--text-primary)] hover:bg-[var(--bg-hover)]'
              : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]'
        }`}
      >
        {isActive && !activeSectionId && (
          <span className="absolute -left-2 top-1.5 bottom-1.5 w-[2px] rounded-full bg-[var(--accent-primary)]" />
        )}
        {/* Expand/collapse chevron */}
        <button
          onClick={hasSections ? handleChevronClick : undefined}
          className={`shrink-0 -ml-1 p-0.5 rounded ${
            hasSections
              ? 'text-[var(--text-tertiary)] hover:text-[var(--text-primary)] cursor-pointer'
              : 'text-transparent cursor-default'
          }`}
        >
          <ChevronRight
            size={13}
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
          title={`${chapter.title} · ${totalWords.toLocaleString()}`}
          className="flex-1 min-w-0 text-left py-[7px] flex items-center gap-2.5 font-serif text-[15px]"
        >
          <span className="text-[13px] text-[var(--text-tertiary)] w-4 text-right shrink-0 tabular">
            {index + 1}
          </span>
          {isRenaming ? (
            <input
              ref={renameInputRef}
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onBlur={commitRename}
              onKeyDown={handleRenameKeyDown}
              onClick={(e) => e.stopPropagation()}
              className="flex-1 min-w-0 bg-[var(--bg-input)] border border-[var(--border-active)] rounded-[var(--radius-sm)] px-2 py-0.5 text-[15px] text-[var(--text-primary)] outline-none"
            />
          ) : (
            <span className="truncate flex-1">{chapter.title}</span>
          )}
        </button>

        {!isRenaming && (
          <span className="relative shrink-0 group-hover:hidden">
            <StatusBadge status={chapter.status} label />
            {hasPendingChanges && (
              <span
                className="absolute -top-1 -left-1 w-1.5 h-1.5 rounded-full animate-pulse bg-[var(--accent-primary)]"
                title="Pending agent changes"
              />
            )}
          </span>
        )}

        {/* Hover actions replace the status so titles never get squeezed */}
        <div className="hidden group-hover:flex items-center shrink-0">
          <button
            onClick={handleAddSection}
            className="p-1 rounded-[var(--radius-sm)] text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-active)]"
            title={t('sidebar:addSection')}
          >
            <Plus size={13} />
          </button>
          <button
            onClick={handleDelete}
            className="p-1 rounded-[var(--radius-sm)] text-[var(--text-tertiary)] hover:text-[var(--color-error)] hover:bg-[var(--bg-active)]"
            title={t('sidebar:deleteChapter')}
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      {/* Sections (expandable) */}
      {hasSections && isExpanded && (
        <div className="relative ml-[30px] my-0.5 border-l border-[var(--border)]">
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
            className="absolute right-2 top-12 z-50 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-[var(--radius-md)] py-1 min-w-[160px] shadow-[var(--shadow-md)]"
            style={{ boxShadow: 'var(--shadow-lg)', animation: 'slide-up 100ms ease-out' }}
          >
            <button
              onClick={startRename}
              className="w-full text-left px-3.5 py-2 text-[13px] text-[var(--text-primary)] hover:bg-[var(--bg-hover)] flex items-center gap-2.5"
            >
              <Pencil size={14} />
              {t('common:rename')}
            </button>
            <button
              onClick={handleAddSection}
              className="w-full text-left px-3.5 py-2 text-[13px] text-[var(--text-primary)] hover:bg-[var(--bg-hover)] flex items-center gap-2.5"
            >
              <Plus size={14} />
              {t('sidebar:addSection')}
            </button>
            <button
              onClick={handleDelete}
              className="w-full text-left px-3.5 py-2 text-[13px] text-[var(--color-error)] hover:bg-[var(--bg-hover)] flex items-center gap-2.5"
            >
              <Trash2 size={14} />
              {t('common:delete')}
            </button>
          </div>
        </>
      )}
    </div>
  )
}

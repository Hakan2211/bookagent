import React, { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import type { SectionMeta } from '@shared/types'
import { StatusBadge } from './StatusBadge'
import { formatWordCount } from '../../lib/formatters'
import { IPC } from '@shared/ipc-channels'
import { useProjectStore } from '../../stores/projectStore'
import { useEditorStore } from '../../stores/editorStore'
import { useChatStore } from '../../stores/chatStore'
import { Trash2, Pencil, FileText } from 'lucide-react'

interface SectionItemProps {
  chapterId: string
  section: SectionMeta
  index: number
  isActive: boolean
  onClick: () => void
}

export function SectionItem({ chapterId, section, index, isActive, onClick }: SectionItemProps) {
  const { t } = useTranslation(['sidebar', 'common'])
  const [showContextMenu, setShowContextMenu] = useState(false)
  const [isRenaming, setIsRenaming] = useState(false)
  const [renameValue, setRenameValue] = useState('')
  const renameInputRef = useRef<HTMLInputElement>(null)
  const refreshManifest = useProjectStore((s) => s.refreshManifest)

  // Check if this specific section has pending agent changes
  const pendingActions = useChatStore((s) => s.pendingActions)
  const hasPendingChanges = pendingActions.some(
    (a) =>
      a.type === 'edit_section' &&
      a.chapterId === chapterId &&
      a.sectionId === section.id
  )

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault()
    setShowContextMenu(true)
  }

  const handleDelete = async () => {
    setShowContextMenu(false)
    const confirmed = await window.api.invoke(IPC.DIALOG_CONFIRM, {
      message: t('sidebar:deleteSectionConfirm', { title: section.title }),
      title: t('sidebar:deleteSectionTitle'),
      confirmLabel: 'Delete'
    })
    if (!confirmed) return

    const editorState = useEditorStore.getState()
    const wasActive =
      editorState.activeChapterId === chapterId &&
      editorState.activeSectionId === section.id

    await window.api.invoke(IPC.SECTION_DELETE, { chapterId, sectionId: section.id })
    await refreshManifest()
    if (wasActive) {
      useEditorStore.getState().reset()
    }
  }

  // ── Inline rename ──────────────────────────
  const startRename = () => {
    setShowContextMenu(false)
    setRenameValue(section.title)
    setIsRenaming(true)
  }

  const commitRename = async () => {
    const newTitle = renameValue.trim()
    setIsRenaming(false)
    if (!newTitle || newTitle === section.title) return

    await window.api.invoke(IPC.SECTION_RENAME, {
      chapterId,
      sectionId: section.id,
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

  return (
    <div className="relative group">
      <div
        className={`relative flex items-center gap-2 ml-1.5 mr-2 pl-3 pr-2 rounded-[var(--radius-sm)] transition-colors ${
          isActive
            ? 'bg-[var(--bg-active)] text-[var(--text-primary)]'
            : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]'
        }`}
      >
        {isActive && (
          <span className="absolute -left-[8px] top-1.5 bottom-1.5 w-[2px] rounded-full bg-[var(--accent-primary)]" />
        )}
        <button
          onClick={onClick}
          onContextMenu={handleContextMenu}
          onDoubleClick={(e) => {
            e.preventDefault()
            startRename()
          }}
          title={`${section.title} · ${section.wordCount.toLocaleString()}`}
          className="flex-1 min-w-0 text-left py-[6px] flex items-center gap-2.5 font-serif text-[14.5px]"
        >
          <FileText size={13} strokeWidth={1.5} className="shrink-0 text-[var(--text-tertiary)]" />
          {isRenaming ? (
            <input
              ref={renameInputRef}
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onBlur={commitRename}
              onKeyDown={handleRenameKeyDown}
              onClick={(e) => e.stopPropagation()}
              className="flex-1 min-w-0 bg-[var(--bg-input)] border border-[var(--border-active)] rounded-[var(--radius-sm)] px-2 py-0.5 text-[14px] text-[var(--text-primary)] outline-none"
            />
          ) : (
            <span className="truncate flex-1">{section.title}</span>
          )}
          {hasPendingChanges && (
            <span className="w-1.5 h-1.5 rounded-full animate-pulse bg-[var(--accent-primary)] shrink-0" title="Pending agent changes" />
          )}
        </button>
        <button
          onClick={handleDelete}
          className="shrink-0 p-1 rounded-[var(--radius-sm)] hidden group-hover:block text-[var(--text-tertiary)] hover:text-[var(--color-error)] hover:bg-[var(--bg-active)]"
          title={t('sidebar:deleteSection')}
        >
          <Trash2 size={12} />
        </button>
      </div>

      {/* Context menu (right-click) */}
      {showContextMenu && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowContextMenu(false)}
          />
          <div
            className="absolute right-2 top-full z-50 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-[var(--radius-md)] py-1 min-w-[160px] shadow-[var(--shadow-md)]"
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

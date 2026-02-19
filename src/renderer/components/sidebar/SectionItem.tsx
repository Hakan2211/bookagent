import React, { useState, useEffect, useRef } from 'react'
import type { SectionMeta } from '@shared/types'
import { StatusBadge } from './StatusBadge'
import { formatWordCount } from '../../lib/formatters'
import { IPC } from '@shared/ipc-channels'
import { useProjectStore } from '../../stores/projectStore'
import { useEditorStore } from '../../stores/editorStore'
import { Trash2, Pencil } from 'lucide-react'

interface SectionItemProps {
  chapterId: string
  section: SectionMeta
  index: number
  isActive: boolean
  onClick: () => void
}

export function SectionItem({ chapterId, section, index, isActive, onClick }: SectionItemProps) {
  const [showContextMenu, setShowContextMenu] = useState(false)
  const [isRenaming, setIsRenaming] = useState(false)
  const [renameValue, setRenameValue] = useState('')
  const renameInputRef = useRef<HTMLInputElement>(null)
  const refreshManifest = useProjectStore((s) => s.refreshManifest)

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault()
    setShowContextMenu(true)
  }

  const handleDelete = async () => {
    setShowContextMenu(false)
    const confirmed = await window.api.invoke(IPC.DIALOG_CONFIRM, {
      message: `Delete section "${section.title}"? This cannot be undone.`,
      title: 'Delete Section',
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
        className={`w-full flex items-center gap-2 text-[14px] transition-all ${
          isActive
            ? 'bg-[var(--bg-active)] text-[var(--text-primary)] border-l-4 border-l-[var(--text-accent)] shadow-[inset_0_0_0_1px_var(--border-subtle)]'
            : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] border-l-4 border-l-transparent'
        }`}
      >
        <button
          onClick={onClick}
          onContextMenu={handleContextMenu}
          onDoubleClick={(e) => {
            e.preventDefault()
            startRename()
          }}
          className="flex-1 min-w-0 text-left pl-14 pr-6 py-2.5 flex items-center gap-2.5"
        >
          <span className="text-[11px] text-[var(--text-secondary)]/60 w-5 text-right shrink-0 tabular-nums font-medium">
            {String(index + 1).padStart(2, '0')}
          </span>
          <StatusBadge status={section.status} />
          {isRenaming ? (
            <input
              ref={renameInputRef}
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onBlur={commitRename}
              onKeyDown={handleRenameKeyDown}
              onClick={(e) => e.stopPropagation()}
              className="flex-1 min-w-0 bg-[var(--bg-input)] border border-[var(--border-active)] rounded-md px-2 py-0.5 text-[14px] text-[var(--text-primary)] outline-none"
            />
          ) : (
            <span className="truncate flex-1">{section.title}</span>
          )}
          {!isRenaming && (
            <span className="text-[11px] text-[var(--text-tertiary)] shrink-0 tabular-nums group-hover:hidden">
              {formatWordCount(section.wordCount)}
            </span>
          )}
        </button>
        <button
          onClick={handleDelete}
          className="shrink-0 mr-3 p-1 rounded-lg opacity-0 group-hover:opacity-100 text-[var(--text-tertiary)] hover:text-[var(--color-error)] hover:bg-[var(--bg-hover)] transition-all"
          title="Delete section"
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
            className="absolute right-2 top-full z-50 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-xl py-1.5 min-w-[160px]"
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

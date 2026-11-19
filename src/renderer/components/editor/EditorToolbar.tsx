import React from 'react'
import { useTranslation } from 'react-i18next'
import type { Editor } from '@tiptap/react'
import { useUIStore } from '../../stores/uiStore'
import {
  Bold,
  Italic,
  Heading1,
  Heading2,
  Heading3,
  Quote,
  Minus,
  List,
  Undo2,
  Redo2,
  Eye,
  FileDown,
  Maximize2
} from 'lucide-react'

interface EditorToolbarProps {
  editor: Editor
}

export function EditorToolbar({ editor }: EditorToolbarProps) {
  const togglePreviewMode = useUIStore((s) => s.togglePreviewMode)
  const openExportModal = useUIStore((s) => s.openExportModal)
  const setFocusMode = useUIStore((s) => s.setFocusMode)

  if (!editor) return null

  const { t } = useTranslation('editor')

  const ToolbarButton = ({
    onClick,
    isActive,
    title,
    children
  }: {
    onClick: () => void
    isActive?: boolean
    title: string
    children: React.ReactNode
  }) => (
    <button
      onClick={onClick}
      title={title}
      className={`w-8 h-8 flex items-center justify-center rounded-[var(--radius-sm)] transition-colors ${
        isActive
          ? 'bg-[var(--accent-tint-strong)] text-[var(--text-accent)]'
          : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]'
      }`}
    >
      {children}
    </button>
  )

  return (
    <div className="flex items-center gap-0.5 px-4 h-11 border-b border-[var(--border)] bg-[var(--bg-editor)] shrink-0 w-full">
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBold().run()}
        isActive={editor.isActive('bold')}
        title={t('editor:bold')}
      >
        <Bold size={15} strokeWidth={1.75} />
      </ToolbarButton>

      <ToolbarButton
        onClick={() => editor.chain().focus().toggleItalic().run()}
        isActive={editor.isActive('italic')}
        title={t('editor:italic')}
      >
        <Italic size={15} strokeWidth={1.75} />
      </ToolbarButton>

      <div className="w-px h-4 bg-[var(--border-strong)] mx-2" />

      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        isActive={editor.isActive('heading', { level: 1 })}
        title={t('editor:heading1')}
      >
        <Heading1 size={15} strokeWidth={1.75} />
      </ToolbarButton>

      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        isActive={editor.isActive('heading', { level: 2 })}
        title={t('editor:heading2')}
      >
        <Heading2 size={15} strokeWidth={1.75} />
      </ToolbarButton>

      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        isActive={editor.isActive('heading', { level: 3 })}
        title={t('editor:heading3')}
      >
        <Heading3 size={15} strokeWidth={1.75} />
      </ToolbarButton>

      <div className="w-px h-4 bg-[var(--border-strong)] mx-2" />

      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        isActive={editor.isActive('blockquote')}
        title={t('editor:blockquote')}
      >
        <Quote size={15} strokeWidth={1.75} />
      </ToolbarButton>

      <ToolbarButton
        onClick={() => editor.chain().focus().setHorizontalRule().run()}
        title={t('editor:sceneBreak')}
      >
        <Minus size={15} strokeWidth={1.75} />
      </ToolbarButton>

      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        isActive={editor.isActive('bulletList')}
        title={t('editor:bulletList')}
      >
        <List size={15} strokeWidth={1.75} />
      </ToolbarButton>

      <div className="w-px h-4 bg-[var(--border-strong)] mx-2" />

      <ToolbarButton
        onClick={() => editor.chain().focus().undo().run()}
        title={t('editor:undo')}
      >
        <Undo2 size={15} strokeWidth={1.75} />
      </ToolbarButton>

      <ToolbarButton
        onClick={() => editor.chain().focus().redo().run()}
        title={t('editor:redo')}
      >
        <Redo2 size={15} strokeWidth={1.75} />
      </ToolbarButton>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Focus, Preview & Export */}
      <ToolbarButton onClick={() => setFocusMode(true)} title={t('editor:focusMode')}>
        <Maximize2 size={15} strokeWidth={1.75} />
      </ToolbarButton>

      <ToolbarButton
        onClick={togglePreviewMode}
        title={t('editor:previewShortcut')}
      >
        <Eye size={15} strokeWidth={1.75} />
      </ToolbarButton>

      <ToolbarButton
        onClick={() => openExportModal()}
        title={t('editor:exportShortcut')}
      >
        <FileDown size={15} strokeWidth={1.75} />
      </ToolbarButton>
    </div>
  )
}

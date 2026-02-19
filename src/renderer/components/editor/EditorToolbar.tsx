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
  FileDown
} from 'lucide-react'

interface EditorToolbarProps {
  editor: Editor
}

export function EditorToolbar({ editor }: EditorToolbarProps) {
  const togglePreviewMode = useUIStore((s) => s.togglePreviewMode)
  const openExportModal = useUIStore((s) => s.openExportModal)

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
      className={`w-9 h-9 flex items-center justify-center rounded-lg transition-all ${
        isActive
          ? 'bg-[var(--bg-active)] text-[var(--text-accent)] shadow-[var(--shadow-xs)]'
          : 'text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]'
      }`}
    >
      {children}
    </button>
  )

  return (
    <div className="flex items-center gap-0.5 px-6 py-2.5 border-b border-[var(--border)] bg-[var(--bg-editor)] shrink-0 w-full">
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBold().run()}
        isActive={editor.isActive('bold')}
        title={t('editor:bold')}
      >
        <Bold size={16} />
      </ToolbarButton>

      <ToolbarButton
        onClick={() => editor.chain().focus().toggleItalic().run()}
        isActive={editor.isActive('italic')}
        title={t('editor:italic')}
      >
        <Italic size={16} />
      </ToolbarButton>

      <div className="w-px h-6 bg-[var(--border)] mx-2" />

      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        isActive={editor.isActive('heading', { level: 1 })}
        title={t('editor:heading1')}
      >
        <Heading1 size={16} />
      </ToolbarButton>

      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        isActive={editor.isActive('heading', { level: 2 })}
        title={t('editor:heading2')}
      >
        <Heading2 size={16} />
      </ToolbarButton>

      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        isActive={editor.isActive('heading', { level: 3 })}
        title={t('editor:heading3')}
      >
        <Heading3 size={16} />
      </ToolbarButton>

      <div className="w-px h-6 bg-[var(--border)] mx-2" />

      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        isActive={editor.isActive('blockquote')}
        title={t('editor:blockquote')}
      >
        <Quote size={16} />
      </ToolbarButton>

      <ToolbarButton
        onClick={() => editor.chain().focus().setHorizontalRule().run()}
        title={t('editor:sceneBreak')}
      >
        <Minus size={16} />
      </ToolbarButton>

      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        isActive={editor.isActive('bulletList')}
        title={t('editor:bulletList')}
      >
        <List size={16} />
      </ToolbarButton>

      <div className="w-px h-6 bg-[var(--border)] mx-2" />

      <ToolbarButton
        onClick={() => editor.chain().focus().undo().run()}
        title={t('editor:undo')}
      >
        <Undo2 size={16} />
      </ToolbarButton>

      <ToolbarButton
        onClick={() => editor.chain().focus().redo().run()}
        title={t('editor:redo')}
      >
        <Redo2 size={16} />
      </ToolbarButton>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Preview & Export */}
      <ToolbarButton
        onClick={togglePreviewMode}
        title={t('editor:previewShortcut')}
      >
        <Eye size={16} />
      </ToolbarButton>

      <ToolbarButton
        onClick={() => openExportModal()}
        title={t('editor:exportShortcut')}
      >
        <FileDown size={16} />
      </ToolbarButton>
    </div>
  )
}

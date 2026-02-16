import React, { useEffect, useRef } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import { useEditorStore } from '../../stores/editorStore'
import { useAutoSave } from '../../hooks/useAutoSave'
import { markdownToHtml, htmlToMarkdown } from '../../lib/markdown'
import { EditorToolbar } from './EditorToolbar'

export function TiptapEditor() {
  const activeChapterId = useEditorStore((s) => s.activeChapterId)
  const activeContent = useEditorStore((s) => s.activeContent)
  const isDirty = useEditorStore((s) => s.isDirty)
  const isInDiffMode = useEditorStore((s) => s.isInDiffMode)
  const updateContent = useEditorStore((s) => s.updateContent)
  const saveChapter = useEditorStore((s) => s.saveChapter)

  // Track whether content update came from the editor itself
  const isEditorUpdateRef = useRef(false)

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] }
      }),
      Placeholder.configure({
        placeholder: 'Start writing...'
      })
    ],
    editorProps: {
      attributes: {
        class: 'ProseMirror'
      }
    },
    editable: !isInDiffMode,
    onUpdate: ({ editor: ed }) => {
      isEditorUpdateRef.current = true
      const html = ed.getHTML()
      const markdown = htmlToMarkdown(html)
      updateContent(markdown)
    }
  })

  // Sync content from store to editor when it changes externally
  // (chapter switch, diff accept, or any non-editor-initiated change)
  useEffect(() => {
    if (!editor) return

    // If the update came from the editor's own onUpdate, skip
    if (isEditorUpdateRef.current) {
      isEditorUpdateRef.current = false
      return
    }

    if (activeContent !== undefined) {
      const html = markdownToHtml(activeContent)
      editor.commands.setContent(html, false)
    }
  }, [activeChapterId, activeContent, editor]) // eslint-disable-line react-hooks/exhaustive-deps

  // Toggle editable state when entering/exiting diff mode
  useEffect(() => {
    if (editor) {
      editor.setEditable(!isInDiffMode)
    }
  }, [editor, isInDiffMode])

  // Auto-save
  useAutoSave(activeContent, isDirty, saveChapter, 1500)

  if (!editor) return null

  return (
    <div className="h-full flex flex-col">
      <EditorToolbar editor={editor} />
      <div className="tiptap-editor flex-1 overflow-y-auto">
        <EditorContent editor={editor} />
      </div>
    </div>
  )
}

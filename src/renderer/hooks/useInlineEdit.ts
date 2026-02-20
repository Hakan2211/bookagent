import { useCallback, useEffect, useRef, useState } from 'react'
import type { Editor } from '@tiptap/react'
import { IPC } from '@shared/ipc-channels'
import { useEditorStore, type InlineEditAction } from '../stores/editorStore'

export interface SelectionMenuPosition {
  top: number
  left: number
  visible: boolean
}

/**
 * Hook that orchestrates the inline edit feature:
 * - Tracks text selection and computes floating menu position
 * - Sends inline edit requests to the main process via IPC
 * - Listens for streaming responses and updates state
 * - Provides accept/reject actions
 */
export function useInlineEdit(editor: Editor | null) {
  const startInlineEdit = useEditorStore((s) => s.startInlineEdit)
  const appendInlineEditText = useEditorStore((s) => s.appendInlineEditText)
  const completeInlineEdit = useEditorStore((s) => s.completeInlineEdit)
  const setInlineEditError = useEditorStore((s) => s.setInlineEditError)
  const clearInlineEdit = useEditorStore((s) => s.clearInlineEdit)
  const inlineEdit = useEditorStore((s) => s.inlineEdit)
  const acceptInlineEdit = useEditorStore((s) => s.acceptInlineEdit)
  const rejectInlineEdit = useEditorStore((s) => s.rejectInlineEdit)

  const [menuPosition, setMenuPosition] = useState<SelectionMenuPosition>({
    top: 0,
    left: 0,
    visible: false
  })

  // Track whether the user is pressing the mouse button (to avoid showing menu mid-drag)
  const isMouseDownRef = useRef(false)

  // ── Selection position tracking ───────────

  const updateMenuPosition = useCallback(() => {
    if (!editor) {
      setMenuPosition((p) => (p.visible ? { ...p, visible: false } : p))
      return
    }

    const { from, to } = editor.state.selection
    const hasSelection = from !== to
    const hasText = editor.state.doc.textBetween(from, to, ' ').trim().length > 0

    // Don't show menu if inline edit is active (we show diff view instead)
    if (inlineEdit.isActive) {
      setMenuPosition((p) => (p.visible ? { ...p, visible: false } : p))
      return
    }

    // Don't show if mouse is still being held down (user is still selecting)
    if (isMouseDownRef.current) {
      return
    }

    if (!hasSelection || !hasText) {
      setMenuPosition((p) => (p.visible ? { ...p, visible: false } : p))
      return
    }

    // Get coordinates from ProseMirror
    try {
      const { view } = editor
      const startCoords = view.coordsAtPos(from)
      const endCoords = view.coordsAtPos(to)

      // Position the menu above the selection, centered horizontally
      const editorRect = view.dom.closest('.tiptap-editor')?.getBoundingClientRect()
      if (!editorRect) return

      const centerX = (startCoords.left + endCoords.right) / 2
      const top = startCoords.top - editorRect.top - 10 // 10px gap above selection
      const left = centerX - editorRect.left

      setMenuPosition({ top, left, visible: true })
    } catch {
      // coordsAtPos can throw if the position is invalid
      setMenuPosition((p) => (p.visible ? { ...p, visible: false } : p))
    }
  }, [editor, inlineEdit.isActive])

  // Listen for selection changes in the editor
  useEffect(() => {
    if (!editor) return

    const onSelectionUpdate = () => {
      // Small delay to let mouse events finish
      requestAnimationFrame(updateMenuPosition)
    }

    editor.on('selectionUpdate', onSelectionUpdate)
    // Also update on blur (to hide menu)
    editor.on('blur', () => {
      // Don't hide immediately — the user might be clicking the menu
      // The menu itself prevents focus loss via onMouseDown preventDefault
    })

    return () => {
      editor.off('selectionUpdate', onSelectionUpdate)
    }
  }, [editor, updateMenuPosition])

  // Track mouse state to avoid showing menu while user is still selecting
  useEffect(() => {
    const onMouseDown = (e: MouseEvent) => {
      isMouseDownRef.current = true
      // Don't hide if clicking inside the selection menu itself —
      // otherwise the menu unmounts before onClick fires on the button
      if ((e.target as HTMLElement).closest('.selection-menu')) return
      if (!inlineEdit.isActive) {
        setMenuPosition((p) => (p.visible ? { ...p, visible: false } : p))
      }
    }
    const onMouseUp = () => {
      isMouseDownRef.current = false
      // Update position after a brief delay (let ProseMirror update selection)
      requestAnimationFrame(updateMenuPosition)
    }

    document.addEventListener('mousedown', onMouseDown)
    document.addEventListener('mouseup', onMouseUp)
    return () => {
      document.removeEventListener('mousedown', onMouseDown)
      document.removeEventListener('mouseup', onMouseUp)
    }
  }, [updateMenuPosition, inlineEdit.isActive])

  // ── IPC listeners for streaming ───────────

  useEffect(() => {
    const offStream = window.api.on(IPC.INLINE_EDIT_STREAM, (data: unknown) => {
      const { text } = data as { text: string }
      appendInlineEditText(text)
    })

    const offDone = window.api.on(IPC.INLINE_EDIT_DONE, (data: unknown) => {
      const { fullText } = data as { fullText: string }
      completeInlineEdit(fullText)
    })

    const offError = window.api.on(IPC.INLINE_EDIT_ERROR, (data: unknown) => {
      const { error } = data as { error: string }
      setInlineEditError(error)
    })

    return () => {
      offStream()
      offDone()
      offError()
    }
  }, [appendInlineEditText, completeInlineEdit, setInlineEditError])

  // ── Actions ───────────────────────────────

  /** Trigger an inline edit action on the current selection */
  const requestInlineEdit = useCallback(
    (action: InlineEditAction, customPrompt?: string) => {
      if (!editor) return

      const { from, to } = editor.state.selection
      if (from === to) return

      const selectedText = editor.state.doc.textBetween(from, to, '\n')
      if (!selectedText.trim()) return

      // Get surrounding context (up to 500 chars before/after)
      // Get surrounding context (text before/after the selection positions)
      const beforeText = editor.state.doc.textBetween(
        0,
        from,
        '\n'
      )
      const afterText = editor.state.doc.textBetween(
        to,
        editor.state.doc.content.size,
        '\n'
      )

      const contextBefore = beforeText.slice(-500)
      const contextAfter = afterText.slice(0, 500)

      // Hide the selection menu
      setMenuPosition({ top: 0, left: 0, visible: false })

      // Start the inline edit
      startInlineEdit(action, selectedText, from, to)

      // Send request to main process
      window.api.invoke(IPC.INLINE_EDIT_REQUEST, {
        selectedText,
        action,
        customPrompt,
        contextBefore,
        contextAfter
      }).catch((err: Error) => {
        setInlineEditError(err.message)
      })
    },
    [editor, startInlineEdit, setInlineEditError]
  )

  /** Accept the inline edit result — replace the selection in the editor */
  const handleAccept = useCallback(() => {
    if (!editor || !inlineEdit.resultText) return

    const { selectionFrom, selectionTo } = inlineEdit

    // Replace the selected text with the AI result
    editor
      .chain()
      .focus()
      .setTextSelection({ from: selectionFrom, to: selectionTo })
      .insertContent(inlineEdit.resultText)
      .run()

    acceptInlineEdit()
  }, [editor, inlineEdit, acceptInlineEdit])

  /** Reject the inline edit — discard the result */
  const handleReject = useCallback(() => {
    rejectInlineEdit()
    // Refocus the editor
    editor?.commands.focus()
  }, [editor, rejectInlineEdit])

  /** Cancel an in-progress inline edit */
  const handleCancel = useCallback(() => {
    clearInlineEdit()
    editor?.commands.focus()
  }, [editor, clearInlineEdit])

  return {
    menuPosition,
    inlineEdit,
    requestInlineEdit,
    handleAccept,
    handleReject,
    handleCancel
  }
}

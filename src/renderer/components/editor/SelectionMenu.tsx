import React, { useState, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import type { SelectionMenuPosition } from '../../hooks/useInlineEdit'
import type { InlineEditAction } from '../../stores/editorStore'

interface SelectionMenuProps {
  position: SelectionMenuPosition
  onAction: (action: InlineEditAction, customPrompt?: string) => void
  containerRef: React.RefObject<HTMLDivElement | null>
}

/**
 * Custom floating menu that appears above the text selection.
 * Rendered as a portal inside the editor container to avoid z-index issues.
 *
 * Key design choice: the entire menu uses onMouseDown={e.preventDefault()}
 * to prevent the browser from shifting focus away from the editor.
 * This is what makes it work — TipTap BubbleMenu failed because it couldn't
 * reliably prevent focus loss.
 */
export function SelectionMenu({ position, onAction, containerRef }: SelectionMenuProps) {
  const { t } = useTranslation('editor')
  const [showCustomInput, setShowCustomInput] = useState(false)
  const [customPrompt, setCustomPrompt] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const handleAction = useCallback(
    (action: InlineEditAction) => {
      if (action === 'custom') {
        setShowCustomInput(true)
        // Focus the input after render — we need to allow this specific focus
        setTimeout(() => inputRef.current?.focus(), 0)
        return
      }
      setShowCustomInput(false)
      setCustomPrompt('')
      onAction(action)
    },
    [onAction]
  )

  const handleCustomSubmit = useCallback(() => {
    if (!customPrompt.trim()) return
    onAction('custom', customPrompt.trim())
    setShowCustomInput(false)
    setCustomPrompt('')
  }, [customPrompt, onAction])

  const handleCustomKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        handleCustomSubmit()
      }
      if (e.key === 'Escape') {
        e.preventDefault()
        setShowCustomInput(false)
        setCustomPrompt('')
      }
    },
    [handleCustomSubmit]
  )

  if (!position.visible || !containerRef.current) return null

  const menu = (
    <div
      className="selection-menu"
      style={{
        position: 'absolute',
        top: `${position.top}px`,
        left: `${position.left}px`,
        transform: 'translate(-50%, -100%)',
        zIndex: 50
      }}
      // CRITICAL: prevent mousedown from stealing focus from the editor
      onMouseDown={(e) => {
        // Don't preventDefault on the input field (it needs focus)
        if ((e.target as HTMLElement).tagName === 'INPUT') return
        e.preventDefault()
      }}
    >
      {showCustomInput ? (
        <div className="selection-menu-custom">
          <input
            ref={inputRef}
            type="text"
            value={customPrompt}
            onChange={(e) => setCustomPrompt(e.target.value)}
            onKeyDown={handleCustomKeyDown}
            placeholder={t('inlineEdit.customPlaceholder')}
            className="selection-menu-input"
          />
          <button
            className="selection-menu-submit"
            onClick={handleCustomSubmit}
          >
            {t('inlineEdit.apply')}
          </button>
        </div>
      ) : (
        <div className="selection-menu-actions">
          <button onClick={() => handleAction('rewrite')} title={t('inlineEdit.rewriteDesc')}>
            {t('inlineEdit.rewrite')}
          </button>
          <button onClick={() => handleAction('change-tone')} title={t('inlineEdit.changeToneDesc')}>
            {t('inlineEdit.changeTone')}
          </button>
          <button onClick={() => handleAction('expand')} title={t('inlineEdit.expandDesc')}>
            {t('inlineEdit.expand')}
          </button>
          <button onClick={() => handleAction('shorten')} title={t('inlineEdit.shortenDesc')}>
            {t('inlineEdit.shorten')}
          </button>
          <button onClick={() => handleAction('continue')} title={t('inlineEdit.continueDesc')}>
            {t('inlineEdit.continue')}
          </button>
          <div className="selection-menu-divider" />
          <button onClick={() => handleAction('custom')} title={t('inlineEdit.customDesc')}>
            {t('inlineEdit.custom')}
          </button>
        </div>
      )}
    </div>
  )

  return createPortal(menu, containerRef.current)
}

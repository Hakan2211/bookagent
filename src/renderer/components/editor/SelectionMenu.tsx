import React, { useState, useRef, useCallback, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import type { SelectionMenuPosition } from '../../hooks/useInlineEdit'
import type { InlineEditAction } from '../../stores/editorStore'
import { WandSparkles, MoveDiagonal, Shrink, ArrowRight, CornerDownLeft } from 'lucide-react'

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

  // Ctrl/Cmd+K jumps into the instruction field while text is selected.
  useEffect(() => {
    if (!position.visible) return
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        inputRef.current?.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [position.visible])

  if (!position.visible || !containerRef.current) return null

  const isMac = navigator.userAgent.includes('Mac')
  const actions: { id: InlineEditAction; icon: React.ReactNode }[] = [
    { id: 'rewrite', icon: <WandSparkles size={17} strokeWidth={1.5} /> },
    { id: 'expand', icon: <MoveDiagonal size={17} strokeWidth={1.5} /> },
    { id: 'shorten', icon: <Shrink size={17} strokeWidth={1.5} /> },
    { id: 'continue', icon: <ArrowRight size={17} strokeWidth={1.5} /> }
  ]
  const tones = ['warmer', 'darker', 'tense', 'simpler'] as const

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
      <div className="w-[440px] rounded-[var(--radius-lg)] border border-[var(--border-strong)] bg-[var(--bg-elevated)] shadow-[var(--shadow-lg)] font-serif">
        {/* Primary actions */}
        <div className="grid grid-cols-4 divide-x divide-[var(--border)] border-b border-[var(--border)]">
          {actions.map((a) => (
            <button
              key={a.id}
              onClick={() => handleAction(a.id)}
              title={t(`inlineEdit.${a.id}Desc`)}
              className="flex flex-col items-center gap-1 py-2.5 text-[14px] text-[var(--text-primary)] hover:bg-[var(--bg-hover)] first:rounded-tl-[var(--radius-lg)] last:rounded-tr-[var(--radius-lg)]"
            >
              <span className="text-[var(--text-secondary)]">{a.icon}</span>
              {t(`inlineEdit.${a.id}`)}
            </button>
          ))}
        </div>

        {/* Tone presets */}
        <div className="flex items-center gap-1.5 px-3 py-2.5 border-b border-[var(--border)]">
          <span className="text-[13.5px] text-[var(--text-secondary)] mr-1">{t('inlineEdit.tone')}</span>
          {tones.map((tone) => (
            <button
              key={tone}
              onClick={() => onAction('custom', t(`inlineEdit.tonePrompt.${tone}`))}
              className="px-3 py-1 rounded-full border border-[var(--border-strong)] text-[13px] text-[var(--text-primary)] hover:bg-[var(--accent-primary)] hover:border-[var(--accent-primary)] hover:text-[var(--text-on-accent)]"
            >
              {t(`inlineEdit.toneName.${tone}`)}
            </button>
          ))}
        </div>

        {/* Free-form instruction */}
        <div className="flex items-center gap-2 p-2.5">
          <input
            ref={inputRef}
            type="text"
            value={customPrompt}
            onChange={(e) => setCustomPrompt(e.target.value)}
            onKeyDown={handleCustomKeyDown}
            placeholder={t('inlineEdit.customPlaceholder')}
            className="flex-1 h-9 px-3 rounded-[var(--radius-md)] bg-[var(--bg-input)] border border-[var(--border)] text-[14px] italic placeholder:text-[var(--text-tertiary)] text-[var(--text-primary)] outline-none focus:border-[var(--border-active)] focus:not-italic"
          />
          <button
            onClick={handleCustomSubmit}
            disabled={!customPrompt.trim()}
            title={t('inlineEdit.apply')}
            className="h-9 w-11 flex items-center justify-center rounded-[var(--radius-md)] bg-[var(--accent-primary)] text-[var(--text-on-accent)] hover:bg-[var(--accent-primary-strong)] disabled:opacity-40"
          >
            <CornerDownLeft size={15} />
          </button>
          <kbd className="font-sans text-[11px] text-[var(--text-tertiary)] px-1">{isMac ? '⌘K' : 'Ctrl K'}</kbd>
        </div>
      </div>
      {/* pointer */}
      <div className="mx-auto -mt-[7px] w-3 h-3 rotate-45 bg-[var(--bg-elevated)] border-r border-b border-[var(--border-strong)]" />
    </div>
  )

  return createPortal(menu, containerRef.current)
}

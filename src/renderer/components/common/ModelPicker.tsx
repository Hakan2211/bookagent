import React, { useCallback, useEffect, useRef, useState } from 'react'
import ReactDOM from 'react-dom'
import { useTranslation } from 'react-i18next'
import { Check, ChevronDown } from 'lucide-react'
import type { ModelInfo } from '@shared/types'
import { TIER_ORDER, formatPricing, priceSigns } from '../../lib/cost'

interface ModelPickerProps {
  models: ModelInfo[]
  value: string
  onChange: (modelId: string) => void
  /** compact: small text trigger above the chat input; field: full-width form field. */
  variant?: 'compact' | 'field'
  /** Which way the menu opens. */
  placement?: 'above' | 'below'
}

const MENU_WIDTH = 340

/** Model selector grouped by price tier, showing what each model is good at and what it costs. */
export function ModelPicker({ models, value, onChange, variant = 'field', placement = 'below' }: ModelPickerProps) {
  const { t } = useTranslation('common')
  const [open, setOpen] = useState(false)
  const [style, setStyle] = useState<React.CSSProperties>({})
  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const selected = models.find((m) => m.id === value)

  const position = useCallback(() => {
    const rect = triggerRef.current?.getBoundingClientRect()
    if (!rect) return
    const width = variant === 'field' ? Math.max(rect.width, MENU_WIDTH) : MENU_WIDTH
    const left = Math.min(rect.left, window.innerWidth - width - 8)
    setStyle(
      placement === 'above'
        ? { position: 'fixed', left, width, bottom: window.innerHeight - rect.top + 4, maxHeight: rect.top - 12, zIndex: 9999 }
        : { position: 'fixed', left, width, top: rect.bottom + 4, maxHeight: window.innerHeight - rect.bottom - 12, zIndex: 9999 }
    )
  }, [placement, variant])

  useEffect(() => {
    if (!open) return
    position()
    const onDown = (e: MouseEvent) => {
      const target = e.target as Node
      if (!triggerRef.current?.contains(target) && !menuRef.current?.contains(target)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    window.addEventListener('resize', position)
    window.addEventListener('scroll', position, true)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
      window.removeEventListener('resize', position)
      window.removeEventListener('scroll', position, true)
    }
  }, [open, position])

  const choose = (id: string) => {
    setOpen(false)
    if (id !== value) onChange(id)
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={
          variant === 'compact'
            ? 'flex items-center gap-1.5 px-1.5 py-1 rounded-[var(--radius-sm)] text-[11.5px] text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] transition-colors'
            : 'w-full h-10 flex items-center gap-2 px-3 bg-[var(--bg-input)] border border-[var(--border)] rounded-[var(--radius-md)] text-left hover:border-[var(--border-strong)] focus:border-[var(--border-active)] outline-none'
        }
      >
        <span
          className={`truncate ${variant === 'compact' ? 'max-w-[200px]' : 'flex-1 font-serif text-[15px] text-[var(--text-primary)]'}`}
        >
          {selected?.name ?? value}
        </span>
        {selected && (
          <span className="shrink-0 tabular-nums text-[var(--text-tertiary)]">
            {variant === 'compact' ? priceSigns(selected) : `${formatPricing(selected)} ${t('common:models.perMillion')}`}
          </span>
        )}
        <ChevronDown size={12} className={`shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open &&
        ReactDOM.createPortal(
          <div
            ref={menuRef}
            role="listbox"
            className="bg-[var(--bg-elevated)] border border-[var(--border)] rounded-[var(--radius-md)] overflow-y-auto py-1"
            style={{ ...style, boxShadow: 'var(--elevation-3)', animation: 'slide-up 150ms cubic-bezier(0.16, 1, 0.3, 1)' }}
          >
            {TIER_ORDER.map((tier) => {
              const group = models.filter((m) => m.tier === tier)
              if (group.length === 0) return null
              return (
                <div key={tier}>
                  <div className="px-4 pt-2.5 pb-1 label-caps text-[10px] text-[var(--text-tertiary)]">
                    {t(`common:models.tier.${tier}`)}
                  </div>
                  {group.map((model) => {
                    const isSelected = model.id === value
                    return (
                      <button
                        key={model.id}
                        type="button"
                        role="option"
                        aria-selected={isSelected}
                        onClick={() => choose(model.id)}
                        className="w-full text-left px-4 py-2 hover:bg-[var(--bg-hover)] transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className={`flex-1 truncate text-[13.5px] ${isSelected ? 'text-[var(--text-accent)]' : 'text-[var(--text-primary)]'}`}
                          >
                            {model.name}
                          </span>
                          {isSelected && <Check size={13} className="shrink-0 text-[var(--text-accent)]" />}
                          <span className="w-9 text-right text-[12px] tabular-nums text-[var(--text-secondary)]">
                            {priceSigns(model)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-[11.5px] text-[var(--text-tertiary)]">
                          <span className="flex-1 truncate">{t(`common:models.strength.${model.strength}`)}</span>
                          <span className="tabular-nums">
                            {formatPricing(model)} {t('common:models.perMillion')}
                          </span>
                        </div>
                      </button>
                    )
                  })}
                </div>
              )
            })}
            <p className="px-4 pt-2 pb-1.5 mt-1 border-t border-[var(--border)] text-[11px] leading-snug text-[var(--text-tertiary)]">
              {t('common:models.pricingNote')}
            </p>
          </div>,
          document.body
        )}
    </>
  )
}

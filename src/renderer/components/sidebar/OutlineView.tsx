import React, { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { IPC } from '@shared/ipc-channels'
import { useProjectStore } from '../../stores/projectStore'
import { ChevronRight, ListTree } from 'lucide-react'

export function OutlineView() {
  const { t } = useTranslation('sidebar')
  const isOpen = useProjectStore((s) => s.isOpen)
  const [expanded, setExpanded] = useState(false)
  const [content, setContent] = useState('')

  useEffect(() => {
    if (isOpen && expanded) {
      loadOutline()
    }
  }, [isOpen, expanded])

  const loadOutline = async () => {
    try {
      const outline = (await window.api.invoke(IPC.NOTE_READ, { noteId: 'outline' })) as string
      setContent(outline)
    } catch {
      // Outline might not exist yet -- try reading the file directly
      setContent('')
    }
  }

  return (
    <div className="mt-1">
      <button
        onClick={() => setExpanded(!expanded)}
        className={`mx-2 w-[calc(100%-1rem)] text-left px-3 py-1.5 rounded-[var(--radius-sm)] font-serif text-[15px] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] flex items-center gap-2.5 ${expanded ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'}`}
      >
        <ListTree size={15} strokeWidth={1.5} className="text-[var(--text-tertiary)] shrink-0" />
        <span className="flex-1">{t('sidebar:outline')}</span>
        <ChevronRight
          size={12}
          className={`text-[var(--text-tertiary)] transition-transform duration-200 ${expanded ? 'rotate-90' : ''}`}
        />
      </button>

      {expanded && (
        <div className="px-5 pl-11 py-2 font-serif text-[14px] text-[var(--text-secondary)] whitespace-pre-wrap max-h-48 overflow-y-auto leading-relaxed">
          {content || (
            <span className="text-[var(--text-secondary)]/80 italic">{t('sidebar:noOutlineYet')}</span>
          )}
        </div>
      )}
    </div>
  )
}

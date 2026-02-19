import React, { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { IPC } from '@shared/ipc-channels'
import { useProjectStore } from '../../stores/projectStore'
import { ChevronRight } from 'lucide-react'

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
    <div>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-6 py-3.5 flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.12em] text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors"
      >
        <ChevronRight
          size={13}
          className={`transition-transform duration-200 ${expanded ? 'rotate-90' : ''}`}
        />
        {t('sidebar:outline')}
      </button>

      {expanded && (
        <div className="px-6 py-4 text-[14px] text-[var(--text-secondary)] whitespace-pre-wrap max-h-48 overflow-y-auto leading-relaxed">
          {content || (
            <span className="text-[var(--text-secondary)]/80 italic">{t('sidebar:noOutlineYet')}</span>
          )}
        </div>
      )}
    </div>
  )
}

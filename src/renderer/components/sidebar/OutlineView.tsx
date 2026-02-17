import React, { useState, useEffect } from 'react'
import { IPC } from '@shared/ipc-channels'
import { useProjectStore } from '../../stores/projectStore'
import { ChevronRight } from 'lucide-react'

export function OutlineView() {
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
        className="w-full px-4 py-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors"
      >
        <ChevronRight
          size={12}
          className={`transition-transform duration-200 ${expanded ? 'rotate-90' : ''}`}
        />
        Outline
      </button>

      {expanded && (
        <div className="px-4 py-1.5 text-xs text-[var(--text-secondary)] whitespace-pre-wrap max-h-48 overflow-y-auto leading-relaxed">
          {content || (
            <span className="text-[var(--text-tertiary)] italic">No outline generated yet</span>
          )}
        </div>
      )}
    </div>
  )
}

import React, { useState, useEffect } from 'react'
import { IPC } from '@shared/ipc-channels'
import { useProjectStore } from '../../stores/projectStore'

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
      // Outline might not exist yet — try reading the file directly
      setContent('')
    }
  }

  return (
    <div>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-3 py-1.5 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
      >
        <span className={`transition-transform text-[8px] ${expanded ? 'rotate-90' : ''}`}>
          &#9654;
        </span>
        Outline
      </button>

      {expanded && (
        <div className="px-3 py-1 text-xs text-[var(--text-secondary)] whitespace-pre-wrap max-h-48 overflow-y-auto">
          {content || 'No outline generated yet'}
        </div>
      )}
    </div>
  )
}

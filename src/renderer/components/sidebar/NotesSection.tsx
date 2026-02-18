import React, { useState } from 'react'
import { useProjectStore } from '../../stores/projectStore'
import { IPC } from '@shared/ipc-channels'
import { ChevronRight, FileText } from 'lucide-react'

export function NotesSection() {
  const manifest = useProjectStore((s) => s.manifest)
  const [expanded, setExpanded] = useState(true)

  if (!manifest) return null

  return (
    <div className="mt-4">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-6 py-3.5 flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.12em] text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors"
      >
        <ChevronRight
          size={13}
          className={`transition-transform duration-200 ${expanded ? 'rotate-90' : ''}`}
        />
        Notes
      </button>

      {expanded && (
        <div>
          {manifest.notes.map((note) => (
            <NoteItem key={note.id} noteId={note.id} title={note.title} />
          ))}
        </div>
      )}
    </div>
  )
}

function NoteItem({ noteId, title }: { noteId: string; title: string }) {
  const [isOpen, setIsOpen] = useState(false)
  const [content, setContent] = useState('')
  const [isDirty, setIsDirty] = useState(false)

  const handleOpen = async () => {
    if (!isOpen) {
      const noteContent = (await window.api.invoke(IPC.NOTE_READ, { noteId })) as string
      setContent(noteContent)
    }
    setIsOpen(!isOpen)
  }

  const handleSave = async () => {
    await window.api.invoke(IPC.NOTE_SAVE, { noteId, content })
    setIsDirty(false)
  }

  return (
    <div>
      <button
        onClick={handleOpen}
        className="w-full text-left px-6 py-3.5 pl-11 text-[15px] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] transition-all flex items-center gap-3"
      >
        <FileText size={14} className="text-[var(--text-tertiary)] shrink-0" />
        {title}
      </button>

      {isOpen && (
        <div className="px-6 pb-4">
          <textarea
            value={content}
            onChange={(e) => {
              setContent(e.target.value)
              setIsDirty(true)
            }}
            onBlur={() => isDirty && handleSave()}
            className="w-full h-40 text-[14px] bg-[var(--bg-input)] text-[var(--text-primary)] border border-[var(--border)] rounded-xl px-4 py-3.5 resize-y outline-none focus:border-[var(--border-active)] focus:shadow-[0_0_0_2px_var(--focus-ring-soft),var(--shadow-glow-sm)] placeholder:text-[var(--text-tertiary)]/85 transition-all leading-relaxed"
            placeholder={`Write ${title.toLowerCase()} here...`}
          />
        </div>
      )}
    </div>
  )
}

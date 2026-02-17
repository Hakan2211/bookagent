import React, { useState } from 'react'
import { useProjectStore } from '../../stores/projectStore'
import { IPC } from '@shared/ipc-channels'
import { ChevronRight, FileText } from 'lucide-react'

export function NotesSection() {
  const manifest = useProjectStore((s) => s.manifest)
  const [expanded, setExpanded] = useState(true)

  if (!manifest) return null

  return (
    <div className="mt-2">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-4 py-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors"
      >
        <ChevronRight
          size={12}
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
        className="w-full text-left px-4 py-2 pl-9 text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] transition-all flex items-center gap-2"
      >
        <FileText size={13} className="text-[var(--text-tertiary)] shrink-0" />
        {title}
      </button>

      {isOpen && (
        <div className="px-3 pb-2">
          <textarea
            value={content}
            onChange={(e) => {
              setContent(e.target.value)
              setIsDirty(true)
            }}
            onBlur={() => isDirty && handleSave()}
            className="w-full h-32 text-xs bg-[var(--bg-input)] text-[var(--text-primary)] border border-[var(--border)] rounded-lg p-3 resize-y outline-none focus:border-[var(--border-active)] focus:shadow-[var(--shadow-glow-sm)] transition-all leading-relaxed"
            placeholder={`Write ${title.toLowerCase()} here...`}
          />
        </div>
      )}
    </div>
  )
}

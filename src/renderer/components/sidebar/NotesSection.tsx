import React, { useState } from 'react'
import { useProjectStore } from '../../stores/projectStore'
import { IPC } from '@shared/ipc-channels'

export function NotesSection() {
  const manifest = useProjectStore((s) => s.manifest)
  const [expanded, setExpanded] = useState(true)

  if (!manifest) return null

  return (
    <div className="mt-2">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-3 py-1.5 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
      >
        <span className={`transition-transform text-[8px] ${expanded ? 'rotate-90' : ''}`}>
          &#9654;
        </span>
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
        className="w-full text-left px-3 py-1.5 pl-8 text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
      >
        {title}
      </button>

      {isOpen && (
        <div className="px-2 pb-2">
          <textarea
            value={content}
            onChange={(e) => {
              setContent(e.target.value)
              setIsDirty(true)
            }}
            onBlur={() => isDirty && handleSave()}
            className="w-full h-32 text-xs bg-[var(--bg-input)] text-[var(--text-primary)] border border-[var(--border)] rounded p-2 resize-y outline-none focus:border-[var(--border-active)]"
            placeholder={`Write ${title.toLowerCase()} here...`}
          />
        </div>
      )}
    </div>
  )
}

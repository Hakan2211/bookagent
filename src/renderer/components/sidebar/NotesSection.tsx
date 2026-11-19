import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useProjectStore } from '../../stores/projectStore'
import { IPC } from '@shared/ipc-channels'
import { ChevronRight, FileText, Users, Globe, BookOpen } from 'lucide-react'

function NoteIcon({ id }: { id: string }) {
  const Icon = id === 'characters' ? Users : id === 'world' ? Globe : id === 'style' ? BookOpen : FileText
  return <Icon size={15} strokeWidth={1.5} className="text-[var(--text-tertiary)] shrink-0" />
}

export function NotesSection() {
  const { t } = useTranslation('sidebar')
  const manifest = useProjectStore((s) => s.manifest)
  const [expanded, setExpanded] = useState(true)

  if (!manifest) return null

  return (
    <div>
      <button
        onClick={() => setExpanded(!expanded)}
        className="label-caps w-full px-5 pb-2 flex items-center gap-1.5 hover:text-[var(--text-secondary)]"
      >
        {t('sidebar:notes')}
        <ChevronRight
          size={11}
          className={`transition-transform duration-200 ${expanded ? 'rotate-90' : ''}`}
        />
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
  const { t } = useTranslation('sidebar')
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
        className={`mx-2 w-[calc(100%-1rem)] text-left px-3 py-1.5 rounded-[var(--radius-sm)] font-serif text-[15px] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] flex items-center gap-2.5 ${isOpen ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'}`}
      >
        <NoteIcon id={noteId} />
        {title}
      </button>

      {isOpen && (
        <div className="px-4 pt-1 pb-3">
          <textarea
            value={content}
            onChange={(e) => {
              setContent(e.target.value)
              setIsDirty(true)
            }}
            onBlur={() => isDirty && handleSave()}
            className="w-full h-40 text-[14px] bg-[var(--bg-input)] text-[var(--text-primary)] border border-[var(--border)] rounded-[var(--radius-md)] px-3 py-2.5 font-serif resize-y outline-none focus:border-[var(--border-active)] placeholder:text-[var(--text-tertiary)]/85 transition-all leading-relaxed"
            placeholder={t('sidebar:writeNotePlaceholder', { title: title.toLowerCase() })}
          />
        </div>
      )}
    </div>
  )
}

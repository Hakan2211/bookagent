import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { TiptapEditor } from './TiptapEditor'
import { useUIStore } from '../../stores/uiStore'
import { useEditorStore } from '../../stores/editorStore'
import { useProjectStore } from '../../stores/projectStore'

/**
 * Distraction-free writing: only the manuscript, the current paragraph lit,
 * a vignette like lamplight, and a quiet pill with words and time.
 */
export function FocusMode() {
  const { t } = useTranslation(['editor', 'common'])
  const setFocusMode = useUIStore((s) => s.setFocusMode)
  const activeContent = useEditorStore((s) => s.activeContent)
  const activeChapterId = useEditorStore((s) => s.activeChapterId)
  const activeSectionId = useEditorStore((s) => s.activeSectionId)
  const manifest = useProjectStore((s) => s.manifest)
  const [startedAt] = useState(() => Date.now())
  const [, tick] = useState(0)

  useEffect(() => {
    const id = setInterval(() => tick((n) => n + 1), 30_000)
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        setFocusMode(false)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => {
      clearInterval(id)
      window.removeEventListener('keydown', onKey)
    }
  }, [setFocusMode])

  // Put the cursor in the text straight away.
  useEffect(() => {
    const timer = setTimeout(() => {
      ;(document.querySelector('.focus-mode .ProseMirror') as HTMLElement | null)?.focus()
    }, 50)
    return () => clearTimeout(timer)
  }, [])

  const chapter = manifest?.chapters.find((c) => c.id === activeChapterId)
  const section = chapter?.sections?.find((s) => s.id === activeSectionId)
  const title = section?.title ?? chapter?.title ?? ''
  const words = (activeContent || '').split(/\s+/).filter(Boolean).length
  const minutes = Math.floor((Date.now() - startedAt) / 60000)

  return (
    <div className="focus-mode fixed inset-0 z-[55] bg-[var(--bg-base)]" style={{ animation: 'fade-in 400ms ease-out' }}>
      <div className="focus-vignette pointer-events-none absolute inset-0 z-10" />
      <div className="h-full">
        <TiptapEditor bare />
      </div>
      <div className="pointer-events-none absolute inset-x-0 top-0 h-28 z-10 bg-gradient-to-b from-[var(--bg-base)] to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-36 z-10 bg-gradient-to-t from-[var(--bg-base)] via-[var(--bg-base)]/80 to-transparent" />
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-1.5">
        <div className="px-4 py-1.5 rounded-full border border-[var(--border-strong)] bg-[var(--bg-base)]/80 font-serif text-[14px] text-[var(--text-secondary)] tabular">
          {title} · {words.toLocaleString()} {t('common:words')} · {t('editor:focusMinutes', { count: minutes })}
        </div>
        <button onClick={() => setFocusMode(false)} className="font-serif italic text-[12.5px] text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]">
          {t('editor:focusExit')}
        </button>
      </div>
    </div>
  )
}

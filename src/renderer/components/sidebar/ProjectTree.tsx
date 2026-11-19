import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useProjectStore } from '../../stores/projectStore'
import { useEditorStore } from '../../stores/editorStore'
import { ChapterItem } from './ChapterItem'
import { NotesSection } from './NotesSection'
import { OutlineView } from './OutlineView'
import { IPC } from '@shared/ipc-channels'
import { Plus, Search } from 'lucide-react'

export function ProjectTree() {
  const { t } = useTranslation(['sidebar', 'common'])
  const manifest = useProjectStore((s) => s.manifest)
  const activeChapterId = useEditorStore((s) => s.activeChapterId)
  const activeSectionId = useEditorStore((s) => s.activeSectionId)
  const openChapter = useEditorStore((s) => s.openChapter)
  const [filter, setFilter] = useState('')

  if (!manifest) return null

  const handleAddChapter = async () => {
    const nextNum = (manifest.chapters.length || 0) + 1
    try {
      const result = (await window.api.invoke(IPC.CHAPTER_CREATE, {
        title: t('common:chapterNum', { num: nextNum }),
        content: ''
      })) as { id: string }
      await useProjectStore.getState().refreshManifest()
      openChapter(result.id)
    } catch (err) {
      console.error('Failed to create chapter:', err)
    }
  }

  const q = filter.trim().toLowerCase()
  const visibleChapters = manifest.chapters
    .map((chapter, index) => ({ chapter, index }))
    .filter(
      ({ chapter }) =>
        !q ||
        chapter.title.toLowerCase().includes(q) ||
        chapter.sections?.some((s) => s.title.toLowerCase().includes(q))
    )

  return (
    <div className="pb-4">
      {/* Book header */}
      <div className="px-5 pt-4 pb-4">
        <h2 className="font-serif text-[26px] leading-tight text-[var(--text-primary)] truncate" title={manifest.title}>
          {manifest.title}
        </h2>
        {manifest.author && (
          <div className="text-[13px] text-[var(--text-secondary)] mt-0.5 truncate">{manifest.author}</div>
        )}
        <div className="relative mt-4">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]" />
          <input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            onKeyDown={(e) => e.key === 'Escape' && setFilter('')}
            placeholder={t('sidebar:filterPlaceholder')}
            className="w-full h-9 pl-8 pr-3 rounded-[var(--radius-md)] bg-transparent border border-[var(--border-strong)] text-[13.5px] font-serif text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] outline-none focus:border-[var(--border-active)]"
          />
        </div>
      </div>

      {/* Chapters */}
      <div className="border-t border-[var(--border)] pt-4">
        <div className="label-caps px-5 pb-2">{t('sidebar:chapters')}</div>
        <div className="space-y-px">
          {visibleChapters.map(({ chapter, index }) => (
            <ChapterItem
              key={chapter.id}
              chapter={chapter}
              index={index}
              isActive={chapter.id === activeChapterId}
              onClick={() => openChapter(chapter.id)}
            />
          ))}
        </div>
        {manifest.chapters.length === 0 && (
          <div className="px-5 py-3 font-serif text-[14px] text-[var(--text-tertiary)] italic">
            {t('sidebar:noChaptersYet')}
          </div>
        )}
        {!q && (
          <button
            onClick={handleAddChapter}
            className="mx-2 mt-1 flex items-center gap-2 px-3 py-1.5 rounded-[var(--radius-sm)] font-serif text-[14.5px] text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]"
          >
            <Plus size={14} strokeWidth={1.5} />
            {t('sidebar:newChapter')}
          </button>
        )}
      </div>

      {/* Notes + outline */}
      <div className="border-t border-[var(--border)] mt-4 pt-4">
        <NotesSection />
        <OutlineView />
      </div>
    </div>
  )
}

import React from 'react'
import { useProjectStore } from '../../stores/projectStore'
import { useEditorStore } from '../../stores/editorStore'
import { ChapterItem } from './ChapterItem'
import { NotesSection } from './NotesSection'
import { OutlineView } from './OutlineView'
import { IPC } from '@shared/ipc-channels'
import { Plus } from 'lucide-react'

export function ProjectTree() {
  const manifest = useProjectStore((s) => s.manifest)
  const activeChapterId = useEditorStore((s) => s.activeChapterId)
  const activeSectionId = useEditorStore((s) => s.activeSectionId)
  const openChapter = useEditorStore((s) => s.openChapter)

  if (!manifest) return null

  const handleAddChapter = async () => {
    const nextNum = (manifest.chapters.length || 0) + 1
    try {
      const result = (await window.api.invoke(IPC.CHAPTER_CREATE, {
        title: `Chapter ${nextNum}`,
        content: ''
      })) as { id: string }
      await useProjectStore.getState().refreshManifest()
      openChapter(result.id)
    } catch (err) {
      console.error('Failed to create chapter:', err)
    }
  }

  return (
    <div className="py-4">
      {/* Outline */}
      <OutlineView />

      {/* Chapters */}
      <div className="mt-4">
        <div className="px-6 py-3.5 flex items-center justify-between">
          <span className="text-[12px] font-semibold uppercase tracking-[0.12em] text-[var(--text-tertiary)]">
            Chapters
          </span>
          <button
            onClick={handleAddChapter}
            className="text-[var(--text-secondary)]/80 hover:text-[var(--text-accent)] transition-all p-2 rounded-lg hover:bg-[var(--bg-hover)] hover:shadow-[var(--shadow-xs)]"
            title="New chapter"
          >
            <Plus size={15} />
          </button>
        </div>
        <div>
          {manifest.chapters.map((chapter, index) => (
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
          <div className="px-6 py-4 text-[14px] text-[var(--text-secondary)]/75 italic">
            No chapters yet
          </div>
        )}
      </div>

      {/* Notes */}
      <NotesSection />
    </div>
  )
}

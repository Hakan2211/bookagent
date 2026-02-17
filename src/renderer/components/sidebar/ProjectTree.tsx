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
    <div className="py-2">
      {/* Outline */}
      <OutlineView />

      {/* Chapters */}
      <div className="mt-1">
        <div className="px-4 py-2 flex items-center justify-between">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-[var(--text-tertiary)]">
            Chapters
          </span>
          <button
            onClick={handleAddChapter}
            className="text-[var(--text-tertiary)] hover:text-[var(--text-accent)] transition-colors p-0.5 rounded hover:bg-[var(--bg-hover)]"
            title="New chapter"
          >
            <Plus size={14} />
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
          <div className="px-4 py-3 text-xs text-[var(--text-tertiary)] italic">
            No chapters yet
          </div>
        )}
      </div>

      {/* Notes */}
      <NotesSection />
    </div>
  )
}

import React from 'react'
import { useProjectStore } from '../../stores/projectStore'
import { useEditorStore } from '../../stores/editorStore'
import { ChapterItem } from './ChapterItem'
import { NotesSection } from './NotesSection'
import { OutlineView } from './OutlineView'

export function ProjectTree() {
  const manifest = useProjectStore((s) => s.manifest)
  const activeChapterId = useEditorStore((s) => s.activeChapterId)
  const openChapter = useEditorStore((s) => s.openChapter)

  if (!manifest) return null

  return (
    <div className="py-1">
      {/* Outline */}
      <OutlineView />

      {/* Chapters */}
      <div className="mt-1">
        <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
          Chapters
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
          <div className="px-3 py-2 text-xs text-[var(--text-secondary)] italic">
            No chapters yet
          </div>
        )}
      </div>

      {/* Notes */}
      <NotesSection />
    </div>
  )
}

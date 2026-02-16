import React, { useState } from 'react'
import type { ProposedChapter } from '@shared/types'
import { formatWordCount } from '../../lib/formatters'

interface ChapterPreviewProps {
  chapters: ProposedChapter[]
  onUpdateChapter: (index: number, updates: Partial<ProposedChapter>) => void
}

export function ChapterPreview({ chapters, onUpdateChapter }: ChapterPreviewProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)

  return (
    <div className="border border-[var(--border)] rounded-lg overflow-hidden max-h-80 overflow-y-auto">
      {chapters.map((chapter, index) => (
        <div
          key={index}
          className={`border-b border-[var(--border)] last:border-b-0 ${
            selectedIndex === index ? 'bg-[var(--bg-hover)]' : ''
          }`}
        >
          <div
            className="flex items-center justify-between px-3 py-2 cursor-pointer hover:bg-[var(--bg-hover)]"
            onClick={() =>
              setSelectedIndex(selectedIndex === index ? null : index)
            }
          >
            <div className="flex items-center gap-2">
              <span className="text-xs text-[var(--text-secondary)] w-6">
                {index + 1}.
              </span>
              <input
                value={chapter.title}
                onChange={(e) =>
                  onUpdateChapter(index, { title: e.target.value })
                }
                onClick={(e) => e.stopPropagation()}
                className="text-sm bg-transparent text-[var(--text-primary)] outline-none border-b border-transparent focus:border-[var(--border-active)]"
              />
            </div>
            <span className="text-xs text-[var(--text-secondary)]">
              {formatWordCount(chapter.wordCount)} words
            </span>
          </div>

          {selectedIndex === index && (
            <div className="px-3 pb-3">
              <p className="text-xs text-[var(--text-secondary)] mb-2 italic">
                {chapter.summary}
              </p>
              <div className="text-xs text-[var(--text-primary)] bg-[var(--bg-input)] rounded p-2 max-h-32 overflow-y-auto whitespace-pre-wrap font-mono">
                {chapter.text.slice(0, 500)}
                {chapter.text.length > 500 && '...'}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

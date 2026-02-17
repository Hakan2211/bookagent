import React, { useState } from 'react'
import type { ProposedChapter } from '@shared/types'
import { formatWordCount } from '../../lib/formatters'
import { ChevronRight } from 'lucide-react'

interface ChapterPreviewProps {
  chapters: ProposedChapter[]
  onUpdateChapter: (index: number, updates: Partial<ProposedChapter>) => void
}

export function ChapterPreview({ chapters, onUpdateChapter }: ChapterPreviewProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)

  return (
    <div className="border border-[var(--border)] rounded-xl overflow-hidden max-h-80 overflow-y-auto">
      {chapters.map((chapter, index) => (
        <div
          key={index}
          className={`border-b border-[var(--border)] last:border-b-0 transition-colors ${
            selectedIndex === index ? 'bg-[var(--bg-hover)]' : ''
          }`}
        >
          <div
            className="flex items-center justify-between px-4 py-2.5 cursor-pointer hover:bg-[var(--bg-hover)] transition-colors"
            onClick={() =>
              setSelectedIndex(selectedIndex === index ? null : index)
            }
          >
            <div className="flex items-center gap-2.5">
              <ChevronRight
                size={13}
                className={`text-[var(--text-tertiary)] transition-transform duration-200 ${
                  selectedIndex === index ? 'rotate-90' : ''
                }`}
              />
              <span className="text-xs text-[var(--text-tertiary)] w-6 tabular-nums font-medium">
                {index + 1}.
              </span>
              <input
                value={chapter.title}
                onChange={(e) =>
                  onUpdateChapter(index, { title: e.target.value })
                }
                onClick={(e) => e.stopPropagation()}
                className="text-sm bg-transparent text-[var(--text-primary)] outline-none border-b border-transparent focus:border-[var(--border-active)] transition-colors"
              />
            </div>
            <span className="text-xs text-[var(--text-tertiary)] tabular-nums font-medium">
              {formatWordCount(chapter.wordCount)} words
            </span>
          </div>

          {selectedIndex === index && (
            <div className="px-4 pb-3.5" style={{ animation: 'slide-up 150ms ease-out' }}>
              <p className="text-xs text-[var(--text-secondary)] mb-2.5 italic leading-relaxed">
                {chapter.summary}
              </p>
              <div className="text-xs text-[var(--text-primary)] bg-[var(--bg-input)] rounded-lg p-3 max-h-32 overflow-y-auto whitespace-pre-wrap font-mono leading-relaxed border border-[var(--border)]">
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

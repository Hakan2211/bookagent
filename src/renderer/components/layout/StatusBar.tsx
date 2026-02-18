import React from 'react'
import { useProjectStore } from '../../stores/projectStore'
import { useEditorStore } from '../../stores/editorStore'
import { useChatStore } from '../../stores/chatStore'

export function StatusBar() {
  const manifest = useProjectStore((s) => s.manifest)
  const isDirty = useEditorStore((s) => s.isDirty)
  const activeChapterId = useEditorStore((s) => s.activeChapterId)
  const isAgentWorking = useChatStore((s) => s.isAgentWorking)

  const totalWords = manifest?.chapters.reduce((sum, ch) => sum + ch.wordCount, 0) || 0
  const targetWords = manifest?.targets.totalWords || 80000
  const percentage = Math.round((totalWords / targetWords) * 100)

  const activeChapter = manifest?.chapters.find((ch) => ch.id === activeChapterId)
  const provider = manifest?.ai.provider || 'none'

  return (
    <div className="h-9 flex items-center px-5 gap-5 bg-[var(--bg-sidebar)] border-t border-[var(--border)] text-sm text-[var(--text-secondary)] shrink-0 select-none">
      {/* Status */}
      {activeChapter && (
        <span
          className="px-2.5 py-1 rounded-md text-xs uppercase font-semibold tracking-wide"
          style={{
            color:
              activeChapter.status === 'final'
                ? 'var(--status-final)'
                : activeChapter.status === 'revised'
                ? 'var(--status-revised)'
                : activeChapter.status === 'draft'
                ? 'var(--status-draft)'
                : 'var(--status-outline)',
            background:
              activeChapter.status === 'final'
                ? 'rgba(52, 211, 153, 0.1)'
                : activeChapter.status === 'revised'
                ? 'rgba(96, 165, 250, 0.1)'
                : activeChapter.status === 'draft'
                ? 'rgba(251, 191, 36, 0.1)'
                : 'rgba(148, 163, 184, 0.1)'
          }}
        >
          {activeChapter.status}
        </span>
      )}

      {/* Save indicator */}
      {isDirty && (
        <span className="text-[var(--color-warning)]/95 flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-warning)] animate-pulse" />
          Unsaved
        </span>
      )}

      {/* Spacer */}
      <div className="flex-1" />

      {/* Word count progress */}
      {manifest && (
        <div className="flex items-center gap-2.5">
          <span className="tabular-nums">
            {totalWords.toLocaleString()} / {targetWords.toLocaleString()} words
          </span>
          <div className="w-24 h-1.5 bg-[var(--bg-active)] rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-secondary)] rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, percentage)}%` }}
            />
          </div>
          <span className="tabular-nums text-[var(--text-tertiary)]">{percentage}%</span>
        </div>
      )}

      {/* AI Provider */}
      <div className="flex items-center gap-1.5">
        <div
          className={`w-1.5 h-1.5 rounded-full ${
            isAgentWorking ? 'bg-[var(--color-warning)] animate-pulse' : 'bg-[var(--color-success)]'
          }`}
        />
        <span className="capitalize">{provider}</span>
      </div>
    </div>
  )
}

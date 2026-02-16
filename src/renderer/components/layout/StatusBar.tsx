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
    <div className="h-6 flex items-center px-3 gap-4 bg-[var(--bg-sidebar)] border-t border-[var(--border)] text-[10px] text-[var(--text-secondary)] shrink-0 select-none">
      {/* Status */}
      {activeChapter && (
        <span
          className="px-1.5 py-0.5 rounded text-[9px] uppercase font-medium"
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
                ? 'rgba(52, 211, 153, 0.15)'
                : activeChapter.status === 'revised'
                ? 'rgba(96, 165, 250, 0.15)'
                : activeChapter.status === 'draft'
                ? 'rgba(251, 191, 36, 0.15)'
                : 'rgba(148, 163, 184, 0.15)'
          }}
        >
          {activeChapter.status}
        </span>
      )}

      {/* Save indicator */}
      {isDirty && <span className="text-amber-400">Unsaved changes</span>}

      {/* Spacer */}
      <div className="flex-1" />

      {/* Word count progress */}
      {manifest && (
        <div className="flex items-center gap-2">
          <span>
            Words: {totalWords.toLocaleString()} / {targetWords.toLocaleString()}
          </span>
          <div className="w-20 h-1.5 bg-[var(--bg-input)] rounded-full overflow-hidden">
            <div
              className="h-full bg-[var(--text-accent)] rounded-full transition-all"
              style={{ width: `${Math.min(100, percentage)}%` }}
            />
          </div>
          <span>{percentage}%</span>
        </div>
      )}

      {/* AI Provider */}
      <div className="flex items-center gap-1">
        <div
          className={`w-1.5 h-1.5 rounded-full ${
            isAgentWorking ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400'
          }`}
        />
        <span className="capitalize">{provider}</span>
      </div>
    </div>
  )
}

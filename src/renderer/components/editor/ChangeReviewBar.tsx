import React from 'react'
import { useTranslation } from 'react-i18next'
import { useEditorStore } from '../../stores/editorStore'
import { useProjectStore } from '../../stores/projectStore'
import { Button } from '../common/Button'
import { GitCompare } from 'lucide-react'

export function ChangeReviewBar() {
  const { t } = useTranslation('editor')
  const pendingDiff = useEditorStore((s) => s.pendingDiff)
  const pendingDiffQueue = useEditorStore((s) => s.pendingDiffQueue)
  const acceptAllChanges = useEditorStore((s) => s.acceptAllChanges)
  const rejectAllChanges = useEditorStore((s) => s.rejectAllChanges)
  const manifest = useProjectStore((s) => s.manifest)

  if (!pendingDiff) return null

  const changeCount = pendingDiff.changeGroups.length
  const totalDiffs = 1 + pendingDiffQueue.length
  const currentDiffNum = 1

  // Resolve the target chapter/section title for the current diff
  const chapter = manifest?.chapters.find((ch) => ch.id === pendingDiff.chapterId)
  let targetLabel = chapter?.title || pendingDiff.chapterId
  if (pendingDiff.sectionId && chapter?.sections) {
    const section = chapter.sections.find((s) => s.id === pendingDiff.sectionId)
    if (section) {
      targetLabel = `${chapter.title} / ${section.title}`
    }
  }

  return (
    <div
      className="flex items-center justify-between px-6 py-2.5 border-b border-[var(--border-active)] shrink-0"
      style={{ background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.08) 0%, rgba(167, 139, 250, 0.05) 100%)' }}
    >
      <div className="flex items-center gap-3 min-w-0">
        <GitCompare size={14} className="text-[var(--text-accent)] shrink-0" />
        <span className="text-sm font-semibold text-[var(--text-primary)] tracking-tight shrink-0">
          {t('editor:reviewMode')}
        </span>

        {/* Queue counter — only shown when there are multiple diffs */}
        {totalDiffs > 1 && (
          <span className="text-xs font-semibold text-[var(--text-accent)] bg-[var(--text-accent)]/10 px-2 py-0.5 rounded-full shrink-0">
            {currentDiffNum} / {totalDiffs}
          </span>
        )}

        <span className="text-xs text-[var(--text-secondary)] font-medium shrink-0">
          {t('editor:changesProposed', { count: changeCount })}
        </span>

        {/* Target chapter/section name */}
        <span className="text-xs text-[var(--text-tertiary)] truncate" title={targetLabel}>
          — {targetLabel}
        </span>

        {pendingDiff.description && (
          <span className="text-xs text-[var(--text-tertiary)] italic truncate" title={pendingDiff.description}>
            — {pendingDiff.description}
          </span>
        )}
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <Button variant="primary" size="sm" onClick={acceptAllChanges}>
          {t('editor:acceptAll')}
        </Button>
        <Button variant="danger" size="sm" onClick={rejectAllChanges}>
          {t('editor:rejectAll')}
        </Button>
      </div>
    </div>
  )
}

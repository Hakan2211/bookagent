import React from 'react'
import { useTranslation } from 'react-i18next'
import { useEditorStore } from '../../stores/editorStore'
import { useProjectStore } from '../../stores/projectStore'
import { Button } from '../common/Button'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useUIStore } from '../../stores/uiStore'
import { useEffect } from 'react'

export function ChangeReviewBar() {
  const { t } = useTranslation('editor')
  const pendingDiff = useEditorStore((s) => s.pendingDiff)
  const pendingDiffQueue = useEditorStore((s) => s.pendingDiffQueue)
  const acceptAllChanges = useEditorStore((s) => s.acceptAllChanges)
  const rejectAllChanges = useEditorStore((s) => s.rejectAllChanges)
  const manifest = useProjectStore((s) => s.manifest)
  const acceptedGroupIds = useEditorStore((s) => s.acceptedGroupIds)
  const focusIndex = useUIStore((s) => s.diffFocusIndex)
  const setFocusIndex = useUIStore((s) => s.setDiffFocusIndex)

  // New diff → start at the first change.
  useEffect(() => setFocusIndex(0), [pendingDiff, setFocusIndex])

  // Ctrl/Cmd+[ and ] step through changes.
  useEffect(() => {
    if (!pendingDiff) return
    const onKey = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey)) return
      const n = pendingDiff.changeGroups.length
      if (!n) return
      const cur = useUIStore.getState().diffFocusIndex
      if (e.key === ']') {
        e.preventDefault()
        setFocusIndex((cur + 1) % n)
      } else if (e.key === '[') {
        e.preventDefault()
        setFocusIndex((cur - 1 + n) % n)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [pendingDiff, setFocusIndex])

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

  const n = changeCount
  const idx = Math.min(focusIndex, Math.max(0, n - 1))
  const acceptedCount = pendingDiff.changeGroups.filter((g) => acceptedGroupIds.has(g.id)).length
  const step = (d: number) => setFocusIndex((idx + d + n) % n)

  return (
    <div className="shrink-0 px-4 pt-3">
      <div className="max-w-[1000px] mx-auto flex items-center gap-4 rounded-[var(--radius-md)] px-4 py-2 bg-[var(--accent-tint)] border border-[var(--accent-tint-strong)]">
        <div className="min-w-0 flex-1 font-serif text-[14.5px] text-[var(--text-primary)] truncate" title={pendingDiff.description || targetLabel}>
          {t('editor:reviewing', { count: n })} · <span className="text-[var(--text-secondary)]">{targetLabel}</span>
          {totalDiffs > 1 && (
            <span className="ml-2 text-[12px] text-[var(--text-tertiary)] font-sans">
              ({currentDiffNum}/{totalDiffs})
            </span>
          )}
        </div>

        {n > 0 && (
          <div className="flex items-center gap-1 font-serif text-[14px] text-[var(--text-primary)] shrink-0">
            <button onClick={() => step(-1)} title={t('editor:prevChange')} className="w-7 h-7 flex items-center justify-center rounded-[var(--radius-sm)] border border-[var(--border-strong)] hover:bg-[var(--bg-hover)]">
              <ChevronLeft size={14} />
            </button>
            <span className="w-16 text-center tabular">{t('editor:stepOf', { i: idx + 1, n })}</span>
            <button onClick={() => step(1)} title={t('editor:nextChange')} className="w-7 h-7 flex items-center justify-center rounded-[var(--radius-sm)] border border-[var(--border-strong)] hover:bg-[var(--bg-hover)]">
              <ChevronRight size={14} />
            </button>
          </div>
        )}

        <div className="flex items-center gap-2 shrink-0">
          <Button variant="secondary" size="sm" onClick={rejectAllChanges}>
            {t('editor:rejectAll')}
          </Button>
          <Button variant="primary" size="sm" onClick={acceptAllChanges}>
            {acceptedCount === n ? t('editor:acceptAll') : t('editor:applySelected', { count: acceptedCount })}
          </Button>
        </div>
      </div>
    </div>
  )
}

import React, { useCallback, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ChevronDown, ChevronUp, GitMerge, GripVertical, Split } from 'lucide-react'
import {
  breakBounds,
  chapterRange,
  countWords,
  mergeWithNext,
  moveBreak,
  renameChapter,
  splitChapter,
  type SplitModel
} from './splitModel'

interface SplitEditorProps {
  model: SplitModel
  onChange: (model: SplitModel) => void
}

/** Short first paragraphs read as chapter headings in the document pane. */
const looksLikeHeading = (p: string) => p.length <= 80 && !/[.!?…:;,]$/.test(p)

/**
 * Two-pane chapter split editor: the original document with draggable
 * chapter-break markers on the left, the resulting chapter list on the right.
 */
export function SplitEditor({ model, onChange }: SplitEditorProps) {
  const { t } = useTranslation(['import', 'common'])
  const paraRefs = useRef<(HTMLDivElement | null)[]>([])
  const docRef = useRef<HTMLDivElement>(null)
  const [dragging, setDragging] = useState<number | null>(null)
  const [focusedChapter, setFocusedChapter] = useState(0)

  const breakAt = new Map<number, number>() // paragraph index → chapter index starting there
  model.starts.forEach((s, i) => {
    if (i > 0) breakAt.set(s, i)
  })

  const scrollToParagraph = useCallback((p: number) => {
    const el = paraRefs.current[p]
    const container = docRef.current
    if (!el || !container) return
    container.scrollTo({ top: el.offsetTop - container.offsetTop - 48, behavior: 'smooth' })
  }, [])

  const goToChapter = (i: number) => {
    const next = Math.max(0, Math.min(model.starts.length - 1, i))
    setFocusedChapter(next)
    scrollToParagraph(model.starts[next])
  }

  /** Nearest allowed paragraph boundary to a pointer y-coordinate. */
  const boundaryAt = (chapter: number, clientY: number): number => {
    const [lo, hi] = breakBounds(model, chapter)
    let best = model.starts[chapter]
    let bestDist = Infinity
    for (let k = lo; k <= hi; k++) {
      const el = paraRefs.current[k]
      if (!el) continue
      const d = Math.abs(el.getBoundingClientRect().top - clientY)
      if (d < bestDist) {
        bestDist = d
        best = k
      }
    }
    return best
  }

  const onPointerDown = (chapter: number) => (e: React.PointerEvent) => {
    e.preventDefault()
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    setDragging(chapter)
  }

  const onPointerMove = (chapter: number) => (e: React.PointerEvent) => {
    if (dragging !== chapter) return
    // Auto-scroll when dragging near the pane edges.
    const pane = docRef.current
    if (pane) {
      const r = pane.getBoundingClientRect()
      if (e.clientY < r.top + 40) pane.scrollBy({ top: -18 })
      else if (e.clientY > r.bottom - 40) pane.scrollBy({ top: 18 })
    }
    const to = boundaryAt(chapter, e.clientY)
    if (to !== model.starts[chapter]) onChange(moveBreak(model, chapter, to))
  }

  const onPointerUp = (e: React.PointerEvent) => {
    ;(e.currentTarget as HTMLElement).releasePointerCapture?.(e.pointerId)
    setDragging(null)
  }

  const onMarkerKey = (chapter: number) => (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      e.preventDefault()
      const to = model.starts[chapter] + (e.key === 'ArrowUp' ? -1 : 1)
      onChange(moveBreak(model, chapter, to))
    }
  }

  const lastChapter = model.starts.length - 1

  return (
    <div className="grid grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)] gap-4 h-[min(56vh,520px)]">
      {/* ── Original document ── */}
      <section className="flex flex-col min-h-0 border border-[var(--border-strong)] rounded-[var(--radius-md)] bg-[var(--bg-page)]">
        <header className="flex items-start justify-between gap-3 px-4 pt-3 pb-2.5 border-b border-[var(--border)]">
          <div>
            <h3 className="font-serif text-[18px] text-[var(--text-primary)]">{t('import:originalDocument')}</h3>
            <p className="text-[12.5px] text-[var(--text-tertiary)]">
              {t('import:dragBreaksHint')}
            </p>
          </div>
          <div className="flex items-center border border-[var(--border-strong)] rounded-[var(--radius-md)]">
            <button
              type="button"
              aria-label={t('import:previousBreak')}
              onClick={() => goToChapter(focusedChapter - 1)}
              className="p-1.5 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]"
            >
              <ChevronUp size={15} />
            </button>
            <button
              type="button"
              aria-label={t('import:nextBreak')}
              onClick={() => goToChapter(focusedChapter + 1)}
              className="p-1.5 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]"
            >
              <ChevronDown size={15} />
            </button>
          </div>
        </header>

        <div ref={docRef} className="relative flex-1 min-h-0 overflow-y-auto px-3 py-3 select-none">
          {model.paragraphs.map((p, k) => {
            const chapterStarting = k === 0 ? 0 : breakAt.get(k)
            const isStart = chapterStarting !== undefined
            const heading = isStart && looksLikeHeading(p)
            return (
              <React.Fragment key={k}>
                {chapterStarting !== undefined && chapterStarting > 0 && (
                  <div
                    role="separator"
                    aria-orientation="horizontal"
                    aria-label={t('import:chapterBreakBefore', { title: model.meta[chapterStarting].title })}
                    tabIndex={0}
                    onPointerDown={onPointerDown(chapterStarting)}
                    onPointerMove={onPointerMove(chapterStarting)}
                    onPointerUp={onPointerUp}
                    onPointerCancel={onPointerUp}
                    onKeyDown={onMarkerKey(chapterStarting)}
                    onFocus={() => setFocusedChapter(chapterStarting)}
                    className={`my-2 flex items-center gap-2 h-8 px-2 rounded-[var(--radius-sm)] border text-[13px] font-serif touch-none outline-none transition-colors ${
                      dragging === chapterStarting
                        ? 'cursor-grabbing bg-[var(--accent-primary-strong)] border-[var(--accent-primary-strong)] text-[var(--text-on-accent)] shadow-lg'
                        : 'cursor-grab bg-[var(--accent-primary)] border-[var(--accent-primary)] text-[var(--text-on-accent)] hover:bg-[var(--accent-primary-strong)] focus-visible:ring-2 focus-visible:ring-[var(--accent-secondary)]'
                    }`}
                  >
                    <GripVertical size={14} className="opacity-80" />
                    {t('import:chapterBreak')}
                    <span className="ml-auto italic opacity-80 truncate max-w-[50%]">
                      {model.meta[chapterStarting].title}
                    </span>
                  </div>
                )}
                <div
                  ref={(el) => {
                    paraRefs.current[k] = el
                  }}
                  className="grid grid-cols-[2.25rem_1fr] gap-1"
                >
                  <span className="pt-[3px] text-right pr-2 text-[11px] tabular-nums text-[var(--text-tertiary)]">
                    {k + 1}
                  </span>
                  <p
                    className={`font-serif leading-relaxed mb-2 ${
                      heading
                        ? 'text-[18px] text-[var(--text-primary)]'
                        : 'text-[14px] text-[var(--text-secondary)] line-clamp-4'
                    }`}
                  >
                    {p}
                  </p>
                </div>
              </React.Fragment>
            )
          })}
        </div>
      </section>

      {/* ── Chapter list ── */}
      <section className="flex flex-col min-h-0 border border-[var(--border-strong)] rounded-[var(--radius-md)]">
        <header className="px-4 pt-3 pb-2.5 border-b border-[var(--border)]">
          <h3 className="font-serif text-[18px] text-[var(--text-primary)]">{t('import:chapterList')}</h3>
          <p className="text-[12.5px] text-[var(--text-tertiary)]">{t('import:mergeSplitHint')}</p>
        </header>
        <ol className="flex-1 min-h-0 overflow-y-auto p-2.5 space-y-2">
          {model.starts.map((_, i) => {
            const [a, b] = chapterRange(model, i)
            const words = model.paragraphs.slice(a, b).reduce((s, p) => s + countWords(p), 0)
            return (
              <li
                key={i}
                onClick={() => goToChapter(i)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-[var(--radius-md)] border cursor-pointer transition-colors ${
                  focusedChapter === i
                    ? 'border-[var(--accent-primary)] bg-[var(--accent-tint)]'
                    : 'border-[var(--border)] hover:bg-[var(--bg-hover)]'
                }`}
              >
                <span className="w-8 h-8 shrink-0 flex items-center justify-center rounded-[var(--radius-sm)] bg-[var(--bg-active)] font-serif text-[14px] text-[var(--text-primary)] tabular-nums">
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <input
                    value={model.meta[i].title}
                    onChange={(e) => onChange(renameChapter(model, i, e.target.value))}
                    onClick={(e) => e.stopPropagation()}
                    aria-label={t('import:chapterTitle')}
                    className="w-full font-serif text-[16px] bg-transparent text-[var(--text-primary)] outline-none border-b border-transparent focus:border-[var(--border-active)]"
                  />
                  <div className="text-[12px] text-[var(--text-tertiary)] tabular-nums">
                    {words.toLocaleString()} {t('common:words')}
                  </div>
                </div>
                <button
                  type="button"
                  title={t('import:mergeWithNext')}
                  aria-label={t('import:mergeWithNext')}
                  disabled={i === lastChapter}
                  onClick={(e) => {
                    e.stopPropagation()
                    onChange(mergeWithNext(model, i))
                  }}
                  className="p-1.5 rounded-[var(--radius-sm)] border border-[var(--border-strong)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] disabled:opacity-30 disabled:pointer-events-none"
                >
                  <GitMerge size={15} />
                </button>
                <button
                  type="button"
                  title={t('import:splitChapter')}
                  aria-label={t('import:splitChapter')}
                  disabled={b - a < 2}
                  onClick={(e) => {
                    e.stopPropagation()
                    onChange(splitChapter(model, i, t('import:newChapterTitle', { n: i + 2 })))
                  }}
                  className="p-1.5 rounded-[var(--radius-sm)] border border-[var(--border-strong)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] disabled:opacity-30 disabled:pointer-events-none"
                >
                  <Split size={15} />
                </button>
              </li>
            )
          })}
        </ol>
      </section>
    </div>
  )
}

import React, { useEffect, useMemo, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import type { ChangeGroup, TextChange } from '@shared/types'
import { Check, X } from 'lucide-react'
import { useUIStore } from '../../stores/uiStore'

interface DiffOverlayProps {
  allChanges: TextChange[]
  changeGroups: ChangeGroup[]
  acceptedGroupIds: Set<string>
  onAccept: (groupId: string) => void
  onReject: (groupId: string) => void
}

interface Segment {
  text: string
  type: TextChange['type']
  groupId?: string
}

/** Split the diff into paragraphs so margin notes can sit beside the text they describe. */
function toParagraphs(allChanges: TextChange[], changeToGroup: Map<string, string>): Segment[][] {
  const paragraphs: Segment[][] = [[]]
  for (const change of allChanges) {
    const groupId = changeToGroup.get(change.id)
    const parts = change.text.replace(/\r\n?/g, '\n').split(/\n{2,}/)
    parts.forEach((part, i) => {
      if (i > 0) paragraphs.push([])
      if (part) paragraphs[paragraphs.length - 1].push({ text: part, type: change.type, groupId })
    })
  }
  return paragraphs.filter((p) => p.some((s) => s.text.trim()))
}

function clip(s: string, n = 26): string {
  const t = s.replace(/\s+/g, ' ').trim()
  return t.length > n ? t.slice(0, n - 1) + '…' : t
}

function describe(group: ChangeGroup, t: (k: string, o?: any) => string): string {
  if (group.description) return group.description
  const del = group.changes.filter((c) => c.type === 'delete').map((c) => c.text).join(' ')
  const ins = group.changes.filter((c) => c.type === 'insert').map((c) => c.text).join(' ')
  if (del.trim() && ins.trim()) return t('editor:diffReplaced', { from: clip(del, 18), to: clip(ins, 18) })
  if (ins.trim()) return t('editor:diffAdded', { text: clip(ins) })
  return t('editor:diffRemoved', { text: clip(del) })
}

/**
 * Tracked-changes view: the manuscript with insertions underlined in sage and
 * deletions struck in oxblood. Each change gets a margin card with accept /
 * reject. Rejected changes preview the original text.
 */
export function DiffOverlay({ allChanges, changeGroups, acceptedGroupIds, onAccept, onReject }: DiffOverlayProps) {
  const { t } = useTranslation(['editor', 'common'])
  const focusIndex = useUIStore((s) => s.diffFocusIndex)
  const refs = useRef<Record<string, HTMLDivElement | null>>({})

  const changeToGroup = useMemo(() => {
    const m = new Map<string, string>()
    for (const g of changeGroups) for (const c of g.changes) m.set(c.id, g.id)
    return m
  }, [changeGroups])
  const paragraphs = useMemo(() => toParagraphs(allChanges, changeToGroup), [allChanges, changeToGroup])
  const focusedId = changeGroups[focusIndex]?.id

  useEffect(() => {
    if (focusedId) refs.current[focusedId]?.scrollIntoView({ block: 'center', behavior: 'smooth' })
  }, [focusedId])

  return (
    <div className="max-w-[1000px] mx-auto pb-24">
      {paragraphs.map((para, pi) => {
        const groupIds = [...new Set(para.map((s) => s.groupId).filter(Boolean))] as string[]
        return (
          <div key={pi} className="grid grid-cols-[minmax(0,680px)_260px] gap-6 mb-5">
            <p className="font-serif text-[19px] leading-[1.62] text-[var(--text-primary)] whitespace-pre-wrap">
              {para.map((seg, si) => {
                if (seg.type === 'equal') return <span key={si}>{seg.text}</span>
                const accepted = seg.groupId ? acceptedGroupIds.has(seg.groupId) : true
                const focused = seg.groupId === focusedId
                if (!accepted) {
                  // Rejected: show what will remain (the original).
                  return seg.type === 'delete' ? <span key={si}>{seg.text}</span> : null
                }
                return (
                  <span
                    key={si}
                    className={`${seg.type === 'insert' ? 'diff-insert' : 'diff-delete'} ${focused ? 'diff-focused' : ''}`}
                  >
                    {seg.text}
                  </span>
                )
              })}
            </p>

            <div className="space-y-2 pt-1">
              {groupIds.map((gid) => {
                const group = changeGroups.find((g) => g.id === gid)
                if (!group) return null
                const accepted = acceptedGroupIds.has(gid)
                const focused = gid === focusedId
                return (
                  <div
                    key={gid}
                    ref={(el) => (refs.current[gid] = el)}
                    onClick={() => useUIStore.getState().setDiffFocusIndex(changeGroups.indexOf(group))}
                    className={`flex items-start gap-2 rounded-[var(--radius-md)] border px-3 py-2 bg-[var(--bg-elevated)] cursor-pointer transition-colors ${
                      focused ? 'border-[var(--border-active)]' : 'border-[var(--border)]'
                    } ${accepted ? '' : 'opacity-60'}`}
                  >
                    <div className="flex-1 min-w-0 text-[12.5px] leading-snug text-[var(--text-secondary)]">
                      {describe(group, t)}
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        onAccept(gid)
                      }}
                      title={t('common:accept')}
                      className={`w-6 h-6 flex items-center justify-center rounded-[var(--radius-sm)] ${
                        accepted
                          ? 'bg-[var(--status-final)] text-[var(--text-on-accent)]'
                          : 'border border-[var(--border-strong)] text-[var(--text-tertiary)] hover:text-[var(--text-primary)]'
                      }`}
                    >
                      <Check size={13} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        onReject(gid)
                      }}
                      title={t('common:reject')}
                      className={`w-6 h-6 flex items-center justify-center rounded-[var(--radius-sm)] ${
                        !accepted
                          ? 'bg-[var(--accent-primary)] text-[var(--text-on-accent)]'
                          : 'border border-[var(--border-strong)] text-[var(--text-tertiary)] hover:text-[var(--text-primary)]'
                      }`}
                    >
                      <X size={13} />
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}

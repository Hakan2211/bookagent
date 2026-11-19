import React, { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useProjectStore } from '../../stores/projectStore'
import { useEditorStore } from '../../stores/editorStore'
import { useChatStore } from '../../stores/chatStore'
import { useUIStore } from '../../stores/uiStore'
import type { ApiStatusState } from '../../stores/uiStore'
import { Check } from 'lucide-react'
import { useUsageStore } from '../../stores/usageStore'
import { formatCost } from '../../lib/cost'

const STATUS_CHECK_INTERVAL = 30_000

export function StatusBar() {
  const { t } = useTranslation(['common', 'editor'])
  const manifest = useProjectStore((s) => s.manifest)
  const isDirty = useEditorStore((s) => s.isDirty)
  const activeChapterId = useEditorStore((s) => s.activeChapterId)
  const isAgentWorking = useChatStore((s) => s.isAgentWorking)
  const agentPhase = useChatStore((s) => s.agentPhase)

  const apiStatus = useUIStore((s) => s.apiStatus)
  const apiModelName = useUIStore((s) => s.apiModelName)
  const apiProvider = useUIStore((s) => s.apiProvider)
  const checkApiStatus = useUIStore((s) => s.checkApiStatus)
  const language = useUIStore((s) => s.language)
  const setLanguage = useUIStore((s) => s.setLanguage)

  const totalWords =
    manifest?.chapters.reduce(
      (sum, ch) =>
        sum + (ch.sections?.length ? ch.sections.reduce((s, sec) => s + sec.wordCount, 0) : ch.wordCount),
      0
    ) || 0

  // Words written this session = growth since the project was opened.
  const sessionBase = useRef<{ title?: string; words: number } | null>(null)
  if (manifest && sessionBase.current?.title !== manifest.title) {
    sessionBase.current = { title: manifest.title, words: totalWords }
  }
  const sessionWords = sessionBase.current ? totalWords - sessionBase.current.words : 0

  // AI spend this app session and what's left on the OpenRouter account.
  const sessionCost = useUsageStore((s) => s.sessionCost)
  const creditsRemaining = useUsageStore((s) => s.creditsRemaining)

  // Poll API connectivity in the background on mount and every 30s
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  useEffect(() => {
    checkApiStatus()
    intervalRef.current = setInterval(checkApiStatus, STATUS_CHECK_INTERVAL)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [checkApiStatus])

  // Derive the dot color and label
  let dotColor: string
  let dotPulse = false
  let statusLabel: string

  // Model name is always shown (set instantly from manifest or from API check)
  const displayName = apiModelName || apiProvider || ''

  if (isAgentWorking) {
    dotColor = 'var(--color-warning)'
    dotPulse = true
    // Show phase-specific label when agent is working
    const phaseLabels: Record<string, string> = {
      classifying: t('common:analyzing'),
      questioning: t('common:askingQuestions'),
      planning: t('common:planning'),
      awaiting_plan: t('common:awaitingApproval'),
      executing: t('common:executing')
    }
    statusLabel = phaseLabels[agentPhase] || displayName || t('common:working')
  } else {
    switch (apiStatus as ApiStatusState) {
      case 'connected':
        dotColor = 'var(--color-success)'
        statusLabel = displayName || t('common:connected')
        break
      case 'checking':
        dotColor = 'var(--color-warning)'
        dotPulse = true
        // Show existing model name while checking, not "Checking..."
        statusLabel = displayName || t('common:checking')
        break
      case 'unavailable':
        dotColor = 'var(--color-error)'
        statusLabel = displayName ? `${displayName} (${t('common:unavailable')})` : t('common:apiUnavailable')
        break
      case 'no-key':
      default:
        dotColor = 'var(--text-tertiary)'
        statusLabel = t('common:noApiKey')
        break
    }
  }

  return (
    <div className="h-7 grid grid-cols-[1fr_auto_1fr] items-center px-4 bg-[var(--bg-sidebar)] border-t border-[var(--border)] text-[12px] text-[var(--text-secondary)] shrink-0 select-none tabular">
      {/* Save state */}
      <div className="flex items-center gap-1.5">
        {isDirty ? (
          <>
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-warning)]" />
            {t('common:unsaved')}
          </>
        ) : (
          <>
            <Check size={12} strokeWidth={2} className="text-[var(--text-tertiary)]" />
            {t('common:saved')}
          </>
        )}
      </div>

      {/* Session progress */}
      <div className="text-[var(--text-tertiary)]">
        {manifest && t('common:sessionWords', { count: sessionWords, words: (sessionWords >= 0 ? '+' : '') + sessionWords.toLocaleString() })}
      </div>

      <div className="flex items-center justify-end gap-4">
        {/* AI spend */}
        {(sessionCost > 0 || creditsRemaining !== null) && (
          <div className="flex items-center gap-1.5 text-[var(--text-tertiary)]" title={t('common:costTooltip')}>
            {sessionCost > 0 && <span>{t('common:sessionCost', { cost: formatCost(sessionCost, language) })}</span>}
            {sessionCost > 0 && creditsRemaining !== null && <span aria-hidden>·</span>}
            {creditsRemaining !== null && (
              <span className={creditsRemaining < 1 ? 'text-[var(--color-warning)]' : undefined}>
                {t('common:creditsLeft', { cost: formatCost(creditsRemaining, language) })}
              </span>
            )}
          </div>
        )}

        {/* API status */}
        <div className="flex items-center gap-1.5">
          <span className="max-w-[180px] truncate">{statusLabel}</span>
          <span
            className={`w-1.5 h-1.5 rounded-full ${dotPulse ? 'animate-pulse' : ''}`}
            style={{ backgroundColor: dotColor }}
          />
        </div>

        {/* Language toggle */}
        <button
          onClick={() => setLanguage(language === 'en' ? 'de' : 'en')}
          className="px-1.5 rounded-[var(--radius-sm)] text-[11px] font-semibold text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] uppercase tracking-wide"
          title={t('common:language')}
        >
          {language === 'en' ? 'EN' : 'DE'}
        </button>
      </div>
    </div>
  )
}

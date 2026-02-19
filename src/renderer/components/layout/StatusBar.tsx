import React, { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useProjectStore } from '../../stores/projectStore'
import { useEditorStore } from '../../stores/editorStore'
import { useChatStore } from '../../stores/chatStore'
import { useUIStore } from '../../stores/uiStore'
import type { ApiStatusState } from '../../stores/uiStore'

const STATUS_CHECK_INTERVAL = 30_000

export function StatusBar() {
  const { t } = useTranslation(['common', 'editor'])
  const manifest = useProjectStore((s) => s.manifest)
  const isDirty = useEditorStore((s) => s.isDirty)
  const activeChapterId = useEditorStore((s) => s.activeChapterId)
  const isAgentWorking = useChatStore((s) => s.isAgentWorking)

  const apiStatus = useUIStore((s) => s.apiStatus)
  const apiModelName = useUIStore((s) => s.apiModelName)
  const apiProvider = useUIStore((s) => s.apiProvider)
  const checkApiStatus = useUIStore((s) => s.checkApiStatus)
  const refreshModelName = useUIStore((s) => s.refreshModelName)
  const language = useUIStore((s) => s.language)
  const setLanguage = useUIStore((s) => s.setLanguage)

  const totalWords = manifest?.chapters.reduce((sum, ch) => sum + ch.wordCount, 0) || 0
  const targetWords = manifest?.targets.totalWords || 0
  const hasTarget = targetWords > 0
  const percentage = hasTarget ? Math.round((totalWords / targetWords) * 100) : 0

  const activeChapter = manifest?.chapters.find((ch) => ch.id === activeChapterId)

  // On mount: immediately show model name from manifest (no network),
  // then start background connectivity check
  const manifestProvider = manifest?.ai?.provider
  const manifestModel = manifest?.ai?.model
  useEffect(() => {
    if (manifestProvider && manifestModel) {
      refreshModelName(manifestProvider, manifestModel)
    }
  }, [manifestProvider, manifestModel, refreshModelName])

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
    statusLabel = displayName || t('common:working')
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
        dotColor = 'var(--color-error, #ef4444)'
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
          {t(('editor:status' + activeChapter.status.charAt(0).toUpperCase() + activeChapter.status.slice(1)) as any)}
        </span>
      )}

      {/* Save indicator */}
      {isDirty && (
        <span className="text-[var(--color-warning)]/95 flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-warning)] animate-pulse" />
          {t('common:unsaved')}
        </span>
      )}

      {/* Spacer */}
      <div className="flex-1" />

      {/* Word count progress */}
      {manifest && (
        <div className="flex items-center gap-2.5">
          {hasTarget ? (
            <>
              <span className="tabular-nums">
                {totalWords.toLocaleString()} / {targetWords.toLocaleString()} {t('common:words')}
              </span>
              <div className="w-24 h-1.5 bg-[var(--bg-active)] rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-secondary)] rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, percentage)}%` }}
                />
              </div>
              <span className="tabular-nums text-[var(--text-tertiary)]">{percentage}%</span>
            </>
          ) : (
            <span className="tabular-nums">
              {totalWords.toLocaleString()} {t('common:words')}
            </span>
          )}
        </div>
      )}

      {/* Language toggle */}
      <button
        onClick={() => setLanguage(language === 'en' ? 'de' : 'en')}
        className="px-2 py-0.5 rounded-md text-xs font-semibold text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] transition-all uppercase tracking-wide"
        title={t('common:language')}
      >
        {language === 'en' ? 'EN' : 'DE'}
      </button>

      {/* API Status */}
      <div className="flex items-center gap-1.5">
        <div
          className={`w-1.5 h-1.5 rounded-full ${dotPulse ? 'animate-pulse' : ''}`}
          style={{ backgroundColor: dotColor }}
        />
        <span className="max-w-[160px] truncate">{statusLabel}</span>
      </div>
    </div>
  )
}

import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Download, RotateCw, X, ArrowUpCircle } from 'lucide-react'
import { IPC } from '@shared/ipc-channels'
import type { UpdateStatus } from '@shared/types'

/**
 * Floating card that tells the user a new Kitapmi version exists and lets
 * them download + restart into it. Driven by electron-updater in main.
 */
export function UpdateNotice() {
  const { t } = useTranslation('common')
  const [status, setStatus] = useState<UpdateStatus | null>(null)
  const [dismissedVersion, setDismissedVersion] = useState<string | null>(null)

  useEffect(() => {
    window.api.invoke(IPC.UPDATE_GET_STATUS).then((s) => setStatus(s as UpdateStatus))
    return window.api.on(IPC.UPDATE_STATUS, (s) => setStatus(s as UpdateStatus))
  }, [])

  if (!status) return null
  const visible =
    status.state === 'available' ||
    status.state === 'downloading' ||
    status.state === 'downloaded' ||
    (status.state === 'error' && !!status.version)
  if (!visible) return null
  // Dismissing hides "available" only; a finished download stays until restart.
  if (status.state === 'available' && dismissedVersion === status.version) return null

  const download = () => window.api.invoke(IPC.UPDATE_DOWNLOAD)
  const install = () => window.api.invoke(IPC.UPDATE_INSTALL)

  return (
    <div
      role="status"
      className="fixed bottom-10 right-5 z-[60] w-[320px] rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-elevated)] shadow-[var(--shadow-lg)] p-4"
      style={{ animation: 'slide-up 300ms var(--ease-out-expo)' }}
    >
      <div className="flex items-start gap-3">
        <ArrowUpCircle size={18} className="mt-0.5 shrink-0 text-[var(--accent-primary)]" strokeWidth={1.5} />
        <div className="min-w-0 flex-1">
          <div className="font-serif text-[15px] text-[var(--text-primary)]">
            {status.state === 'downloaded'
              ? t('update.ready', { version: status.version })
              : t('update.available', { version: status.version })}
          </div>
          <div className="text-xs text-[var(--text-tertiary)] mt-0.5">
            {status.state === 'downloading'
              ? t('update.downloading', { percent: status.percent ?? 0 })
              : status.state === 'downloaded'
                ? t('update.restartHint')
                : status.state === 'error'
                  ? t('update.failed')
                  : t('update.current', { version: status.currentVersion })}
          </div>

          {status.state === 'downloading' && (
            <div className="mt-2.5 h-1 rounded-full bg-[var(--bg-hover)] overflow-hidden">
              <div
                className="h-full bg-[var(--accent-primary)] transition-[width] duration-300"
                style={{ width: `${status.percent ?? 0}%` }}
              />
            </div>
          )}

          <div className="mt-3 flex gap-2">
            {(status.state === 'available' || status.state === 'error') && (
              <button
                onClick={download}
                className="inline-flex items-center gap-1.5 rounded-[var(--radius-md)] bg-[var(--accent-primary)] px-3 py-1.5 text-xs font-medium text-[var(--text-on-accent)] hover:bg-[var(--accent-primary-strong)] transition-colors"
              >
                <Download size={13} />
                {status.manual ? t('update.openDownload') : t('update.updateNow')}
              </button>
            )}
            {status.state === 'downloaded' && (
              <button
                onClick={install}
                className="inline-flex items-center gap-1.5 rounded-[var(--radius-md)] bg-[var(--accent-primary)] px-3 py-1.5 text-xs font-medium text-[var(--text-on-accent)] hover:bg-[var(--accent-primary-strong)] transition-colors"
              >
                <RotateCw size={13} />
                {t('update.restart')}
              </button>
            )}
            {status.state === 'available' && (
              <button
                onClick={() => setDismissedVersion(status.version ?? null)}
                className="rounded-[var(--radius-md)] px-3 py-1.5 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors"
              >
                {t('update.later')}
              </button>
            )}
          </div>
        </div>
        {status.state === 'available' && (
          <button
            onClick={() => setDismissedVersion(status.version ?? null)}
            className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
            aria-label={t('close')}
          >
            <X size={14} />
          </button>
        )}
      </div>
    </div>
  )
}

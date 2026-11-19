import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Feather, RefreshCw, Loader2, Check } from 'lucide-react'
import { IPC } from '@shared/ipc-channels'
import type { UpdateStatus } from '@shared/types'
import { Button } from '../common/Button'

export function AboutSettings() {
  const { t } = useTranslation(['settings', 'common'])
  const [status, setStatus] = useState<UpdateStatus | null>(null)
  const [checked, setChecked] = useState(false)

  useEffect(() => {
    window.api.invoke(IPC.UPDATE_GET_STATUS).then((s) => setStatus(s as UpdateStatus))
    return window.api.on(IPC.UPDATE_STATUS, (s) => setStatus(s as UpdateStatus))
  }, [])

  const check = async () => {
    setChecked(true)
    const s = (await window.api.invoke(IPC.UPDATE_CHECK)) as UpdateStatus
    setStatus(s)
  }

  const state = status?.state
  return (
    <div className="max-w-[460px]">
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 rounded-[var(--radius-lg)] bg-[var(--accent-primary)] flex items-center justify-center">
          <Feather size={26} strokeWidth={1.5} className="text-[var(--text-on-accent)]" />
        </div>
        <div>
          <div className="font-serif text-[22px] text-[var(--text-primary)]">Kitapmi</div>
          <div className="text-[13px] text-[var(--text-secondary)]">
            {t('common:update.version', { version: status?.currentVersion ?? '…' })}
          </div>
        </div>
      </div>
      <p className="mt-5 font-serif text-[15px] text-[var(--text-secondary)] leading-relaxed">{t('settings:about.desc')}</p>

      <div className="mt-6 flex items-center gap-3">
        <Button variant="secondary" size="sm" onClick={check} disabled={state === 'checking' || state === 'downloading'}>
          {state === 'checking' ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
          {t('common:update.checkNow')}
        </Button>
        {checked && state === 'not-available' && (
          <span className="flex items-center gap-1.5 text-[13px] text-[var(--color-success)]">
            <Check size={13} />
            {t('common:update.upToDate')}
          </span>
        )}
        {(state === 'available' || state === 'downloaded') && (
          <span className="text-[13px] text-[var(--text-accent)]">
            {t('common:update.available', { version: status?.version })}
          </span>
        )}
      </div>
    </div>
  )
}

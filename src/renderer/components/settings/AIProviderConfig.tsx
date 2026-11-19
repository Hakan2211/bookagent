import React, { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '../common/Button'
import { ModelPicker } from '../common/ModelPicker'
import { IPC } from '@shared/ipc-channels'
import type { ModelInfo } from '@shared/types'
import { CheckCircle2, AlertCircle, Info } from 'lucide-react'
import { selectUtilityModel, selectWritingModel } from '../../lib/models'
import { useUIStore } from '../../stores/uiStore'
import { useUsageStore } from '../../stores/usageStore'

export function AIProviderConfig() {
  const { t } = useTranslation(['settings', 'common'])
  const [openrouterKey, setOpenrouterKey] = useState('')
  const [openrouterHasKey, setOpenrouterHasKey] = useState(false)
  const [openrouterModel, setOpenrouterModel] = useState('')
  const [utilityModel, setUtilityModel] = useState('')
  const [openrouterModels, setOpenrouterModels] = useState<ModelInfo[]>([])
  const [isValidating, setIsValidating] = useState(false)
  const [status, setStatus] = useState<string | null>(null)

  useEffect(() => {
    loadStatus()
    loadModels()
  }, [])

  const loadStatus = async () => {
    const keyStatus = (await window.api.invoke(IPC.SETTINGS_GET_API_KEY_STATUS)) as {
      openrouter: boolean
    }
    setOpenrouterHasKey(keyStatus.openrouter)

    const settings = (await window.api.invoke(IPC.SETTINGS_GET)) as Record<string, any>
    if (settings.openrouterModel) setOpenrouterModel(settings.openrouterModel)
    if (settings.openrouterUtilityModel) setUtilityModel(settings.openrouterUtilityModel)
  }

  const loadModels = async () => {
    const orModels = (await window.api.invoke(IPC.SETTINGS_GET_MODELS, {
      provider: 'openrouter'
    })) as ModelInfo[]
    setOpenrouterModels(orModels)
  }

  const handleSaveKey = async (key: string) => {
    if (!key.trim()) return
    setIsValidating(true)
    setStatus(null)

    try {
      const result = (await window.api.invoke(IPC.SETTINGS_SET_API_KEY, {
        provider: 'openrouter',
        key: key.trim()
      })) as { valid: boolean }

      if (result.valid) {
        setStatus(t('settings:ai.keySaved', { provider: 'OpenRouter' }))
        setOpenrouterHasKey(true)
        setOpenrouterKey('')
        // Refresh status bar connectivity immediately
        useUIStore.getState().checkApiStatus()
        void useUsageStore.getState().refreshCredits()
      } else {
        setStatus(t('settings:ai.invalidKey', { provider: 'OpenRouter' }))
      }
    } catch (err) {
      setStatus(`Error: ${(err as Error).message}`)
    } finally {
      setIsValidating(false)
    }
  }

  const handleModelChange = async (model: string) => {
    setOpenrouterModel(model)
    await selectWritingModel(model)
  }

  const handleUtilityModelChange = async (model: string) => {
    setUtilityModel(model)
    await selectUtilityModel(model)
  }

  const isStatusError = status?.includes('Error') || status?.includes('Invalid')

  return (
    <div className="space-y-8">
      {status && (
        <div
          className={`p-4 rounded-[var(--radius-md)] text-sm flex items-center gap-2.5 ${
            isStatusError
              ? 'bg-red-500/10 text-red-300 border border-red-500/20'
              : 'bg-[var(--diff-insert-bg)] text-[var(--color-success)] border border-[var(--status-final)]/30'
          }`}
          style={{ animation: 'slide-up 200ms ease-out' }}
        >
          {isStatusError ? <AlertCircle size={16} /> : <CheckCircle2 size={16} />}
          {status}
        </div>
      )}

      {/* OpenRouter */}
      <div className="space-y-4">
        <div className="flex items-center gap-2.5">
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">{t('settings:ai.openrouter')}</h3>
          {openrouterHasKey && (
            <span className="text-[11px] px-2.5 py-1 rounded-lg bg-[var(--diff-insert-bg)] text-[var(--color-success)] font-medium">
              {t('settings:ai.connected')}
            </span>
          )}
        </div>

        <p className="text-[12px] text-[var(--text-tertiary)] leading-relaxed">
          {t('settings:ai.openrouterDesc')}
        </p>

        <div className="flex gap-3">
          <input
            type="password"
            value={openrouterKey}
            onChange={(e) => setOpenrouterKey(e.target.value)}
            placeholder={openrouterHasKey ? t('settings:ai.keySavedPlaceholder') : 'sk-or-...'}
            className="flex-1 h-10 px-3 font-serif text-[15px] bg-[var(--bg-input)] border border-[var(--border)] rounded-[var(--radius-md)] text-[var(--text-primary)] outline-none focus:border-[var(--border-active)] transition-all"
          />
          <Button
            size="md"
            onClick={() => handleSaveKey(openrouterKey)}
            isLoading={isValidating}
            disabled={!openrouterKey.trim()}
          >
            {t('common:save')}
          </Button>
        </div>

        {openrouterModel && openrouterModels.length > 0 && (
          <div className="space-y-1.5">
            <label className="block label-caps">{t('settings:ai.writingModel')}</label>
            <ModelPicker models={openrouterModels} value={openrouterModel} onChange={handleModelChange} />
            <p className="text-[12px] text-[var(--text-tertiary)]">{t('settings:ai.writingModelDesc')}</p>
          </div>
        )}

        {utilityModel && openrouterModels.length > 0 && (
          <div className="space-y-1.5">
            <label className="block label-caps">{t('settings:ai.utilityModel')}</label>
            <ModelPicker models={openrouterModels} value={utilityModel} onChange={handleUtilityModelChange} />
            <p className="text-[12px] text-[var(--text-tertiary)]">{t('settings:ai.utilityModelDesc')}</p>
          </div>
        )}

        <p className="flex items-center gap-2 font-serif text-[14px] text-[var(--text-secondary)]">
          <Info size={14} strokeWidth={1.5} className="shrink-0" />
          {t('settings:ai.privacyNote')}
        </p>
      </div>
    </div>
  )
}

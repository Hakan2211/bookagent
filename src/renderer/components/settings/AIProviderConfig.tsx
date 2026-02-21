import React, { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '../common/Button'
import { Dropdown } from '../common/Dropdown'
import { IPC } from '@shared/ipc-channels'
import type { ModelInfo } from '@shared/types'
import { CheckCircle2, AlertCircle } from 'lucide-react'
import { useProjectStore } from '../../stores/projectStore'
import { useUIStore } from '../../stores/uiStore'

export function AIProviderConfig() {
  const { t } = useTranslation(['settings', 'common'])
  const [openrouterKey, setOpenrouterKey] = useState('')
  const [openrouterHasKey, setOpenrouterHasKey] = useState(false)
  const [openrouterModel, setOpenrouterModel] = useState('google/gemini-3-flash-preview')
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
    await window.api.invoke(IPC.SETTINGS_SET, { openrouterModel: model })

    // Also update the open project's AI config
    const projectState = useProjectStore.getState()
    if (projectState.isOpen && projectState.manifest) {
      await window.api.invoke(IPC.PROJECT_UPDATE_SETTINGS, {
        aiProvider: 'openrouter',
        aiModel: model
      })
      projectState.updateManifest({
        ai: { provider: 'openrouter' as any, model, keyRef: 'kitapmi-openrouter-key' }
      })
    }

    // Instantly update the status bar model name
    useUIStore.getState().refreshModelName('openrouter', model)
  }

  const isStatusError = status?.includes('Error') || status?.includes('Invalid')

  return (
    <div className="space-y-8">
      {status && (
        <div
          className={`p-4 rounded-xl text-sm flex items-center gap-2.5 ${
            isStatusError
              ? 'bg-red-500/10 text-red-300 border border-red-500/20'
              : 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20'
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
            <span className="text-[11px] px-2.5 py-1 rounded-lg bg-emerald-500/15 text-emerald-400 font-medium">
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
            className="flex-1 px-4 py-3 text-[15px] bg-[var(--bg-input)] border border-[var(--border)] rounded-xl text-[var(--text-primary)] outline-none focus:border-[var(--border-active)] focus:shadow-[var(--shadow-glow-sm)] transition-all"
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

        <Dropdown
          options={openrouterModels.map((m) => ({ value: m.id, label: m.name }))}
          value={openrouterModel}
          onChange={(v) => handleModelChange(v)}
          placeholder={t('settings:ai.selectModel')}
        />
      </div>
    </div>
  )
}

import React, { useState, useEffect } from 'react'
import { Button } from '../common/Button'
import { Dropdown } from '../common/Dropdown'
import { IPC } from '@shared/ipc-channels'
import type { ModelInfo } from '@shared/types'
import { CheckCircle2, AlertCircle } from 'lucide-react'

export function AIProviderConfig() {
  const [anthropicKey, setAnthropicKey] = useState('')
  const [openaiKey, setOpenaiKey] = useState('')
  const [openrouterKey, setOpenrouterKey] = useState('')
  const [anthropicHasKey, setAnthropicHasKey] = useState(false)
  const [openaiHasKey, setOpenaiHasKey] = useState(false)
  const [openrouterHasKey, setOpenrouterHasKey] = useState(false)
  const [anthropicModel, setAnthropicModel] = useState('claude-sonnet-4-5-20250929')
  const [openaiModel, setOpenaiModel] = useState('gpt-4o')
  const [openrouterModel, setOpenrouterModel] = useState('anthropic/claude-sonnet-4.6')
  const [anthropicModels, setAnthropicModels] = useState<ModelInfo[]>([])
  const [openaiModels, setOpenaiModels] = useState<ModelInfo[]>([])
  const [openrouterModels, setOpenrouterModels] = useState<ModelInfo[]>([])
  const [isValidating, setIsValidating] = useState(false)
  const [status, setStatus] = useState<string | null>(null)

  useEffect(() => {
    loadStatus()
    loadModels()
  }, [])

  const loadStatus = async () => {
    const keyStatus = (await window.api.invoke(IPC.SETTINGS_GET_API_KEY_STATUS)) as {
      anthropic: boolean
      openai: boolean
      openrouter: boolean
    }
    setAnthropicHasKey(keyStatus.anthropic)
    setOpenaiHasKey(keyStatus.openai)
    setOpenrouterHasKey(keyStatus.openrouter)

    const settings = (await window.api.invoke(IPC.SETTINGS_GET)) as Record<string, any>
    if (settings.anthropicModel) setAnthropicModel(settings.anthropicModel)
    if (settings.openaiModel) setOpenaiModel(settings.openaiModel)
    if (settings.openrouterModel) setOpenrouterModel(settings.openrouterModel)
  }

  const loadModels = async () => {
    const aModels = (await window.api.invoke(IPC.SETTINGS_GET_MODELS, {
      provider: 'anthropic'
    })) as ModelInfo[]
    setAnthropicModels(aModels)

    const oModels = (await window.api.invoke(IPC.SETTINGS_GET_MODELS, {
      provider: 'openai'
    })) as ModelInfo[]
    setOpenaiModels(oModels)

    const orModels = (await window.api.invoke(IPC.SETTINGS_GET_MODELS, {
      provider: 'openrouter'
    })) as ModelInfo[]
    setOpenrouterModels(orModels)
  }

  const handleSaveKey = async (provider: string, key: string) => {
    if (!key.trim()) return
    setIsValidating(true)
    setStatus(null)

    try {
      const result = (await window.api.invoke(IPC.SETTINGS_SET_API_KEY, {
        provider,
        key: key.trim()
      })) as { valid: boolean }

      if (result.valid) {
        setStatus(`${provider} key saved successfully`)
        if (provider === 'anthropic') {
          setAnthropicHasKey(true)
          setAnthropicKey('')
        } else if (provider === 'openai') {
          setOpenaiHasKey(true)
          setOpenaiKey('')
        } else if (provider === 'openrouter') {
          setOpenrouterHasKey(true)
          setOpenrouterKey('')
        }
        // Refresh status bar connectivity immediately
        const { useUIStore } = await import('../../stores/uiStore')
        useUIStore.getState().checkApiStatus()
      } else {
        setStatus(`Invalid ${provider} API key`)
      }
    } catch (err) {
      setStatus(`Error: ${(err as Error).message}`)
    } finally {
      setIsValidating(false)
    }
  }

  const handleModelChange = async (provider: string, model: string) => {
    if (provider === 'anthropic') {
      setAnthropicModel(model)
      await window.api.invoke(IPC.SETTINGS_SET, { anthropicModel: model })
    } else if (provider === 'openai') {
      setOpenaiModel(model)
      await window.api.invoke(IPC.SETTINGS_SET, { openaiModel: model })
    } else if (provider === 'openrouter') {
      setOpenrouterModel(model)
      await window.api.invoke(IPC.SETTINGS_SET, { openrouterModel: model })
    }
    // Instantly update the status bar model name
    const { useUIStore } = await import('../../stores/uiStore')
    useUIStore.getState().refreshModelName(provider, model)
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

      {/* Anthropic */}
      <div className="space-y-4">
        <div className="flex items-center gap-2.5">
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">Anthropic (Claude)</h3>
          {anthropicHasKey && (
            <span className="text-[11px] px-2.5 py-1 rounded-lg bg-emerald-500/15 text-emerald-400 font-medium">
              Connected
            </span>
          )}
        </div>

        <div className="flex gap-3">
          <input
            type="password"
            value={anthropicKey}
            onChange={(e) => setAnthropicKey(e.target.value)}
            placeholder={anthropicHasKey ? 'Key saved (enter new to replace)' : 'sk-ant-...'}
            className="flex-1 px-4 py-3 text-[15px] bg-[var(--bg-input)] border border-[var(--border)] rounded-xl text-[var(--text-primary)] outline-none focus:border-[var(--border-active)] focus:shadow-[var(--shadow-glow-sm)] transition-all"
          />
          <Button
            size="md"
            onClick={() => handleSaveKey('anthropic', anthropicKey)}
            isLoading={isValidating}
            disabled={!anthropicKey.trim()}
          >
            Save
          </Button>
        </div>

        <Dropdown
          options={anthropicModels.map((m) => ({ value: m.id, label: m.name }))}
          value={anthropicModel}
          onChange={(v) => handleModelChange('anthropic', v)}
          placeholder="Select model"
        />
      </div>

      <div className="border-t border-[var(--border)]" />

      {/* OpenAI */}
      <div className="space-y-4">
        <div className="flex items-center gap-2.5">
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">OpenAI</h3>
          {openaiHasKey && (
            <span className="text-[11px] px-2.5 py-1 rounded-lg bg-emerald-500/15 text-emerald-400 font-medium">
              Connected
            </span>
          )}
        </div>

        <div className="flex gap-3">
          <input
            type="password"
            value={openaiKey}
            onChange={(e) => setOpenaiKey(e.target.value)}
            placeholder={openaiHasKey ? 'Key saved (enter new to replace)' : 'sk-...'}
            className="flex-1 px-4 py-3 text-[15px] bg-[var(--bg-input)] border border-[var(--border)] rounded-xl text-[var(--text-primary)] outline-none focus:border-[var(--border-active)] focus:shadow-[var(--shadow-glow-sm)] transition-all"
          />
          <Button
            size="md"
            onClick={() => handleSaveKey('openai', openaiKey)}
            isLoading={isValidating}
            disabled={!openaiKey.trim()}
          >
            Save
          </Button>
        </div>

        <Dropdown
          options={openaiModels.map((m) => ({ value: m.id, label: m.name }))}
          value={openaiModel}
          onChange={(v) => handleModelChange('openai', v)}
          placeholder="Select model"
        />
      </div>

      <div className="border-t border-[var(--border)]" />

      {/* OpenRouter */}
      <div className="space-y-4">
        <div className="flex items-center gap-2.5">
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">OpenRouter</h3>
          {openrouterHasKey && (
            <span className="text-[11px] px-2.5 py-1 rounded-lg bg-emerald-500/15 text-emerald-400 font-medium">
              Connected
            </span>
          )}
        </div>

        <p className="text-[12px] text-[var(--text-tertiary)] leading-relaxed">
          Access 200+ models from all major providers through a single API key.
        </p>

        <div className="flex gap-3">
          <input
            type="password"
            value={openrouterKey}
            onChange={(e) => setOpenrouterKey(e.target.value)}
            placeholder={openrouterHasKey ? 'Key saved (enter new to replace)' : 'sk-or-...'}
            className="flex-1 px-4 py-3 text-[15px] bg-[var(--bg-input)] border border-[var(--border)] rounded-xl text-[var(--text-primary)] outline-none focus:border-[var(--border-active)] focus:shadow-[var(--shadow-glow-sm)] transition-all"
          />
          <Button
            size="md"
            onClick={() => handleSaveKey('openrouter', openrouterKey)}
            isLoading={isValidating}
            disabled={!openrouterKey.trim()}
          >
            Save
          </Button>
        </div>

        <Dropdown
          options={openrouterModels.map((m) => ({ value: m.id, label: m.name }))}
          value={openrouterModel}
          onChange={(v) => handleModelChange('openrouter', v)}
          placeholder="Select model"
        />
      </div>
    </div>
  )
}

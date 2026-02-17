import React, { useState, useEffect } from 'react'
import { Button } from '../common/Button'
import { Dropdown } from '../common/Dropdown'
import { IPC } from '@shared/ipc-channels'
import type { ModelInfo } from '@shared/types'
import { CheckCircle2, AlertCircle } from 'lucide-react'

export function AIProviderConfig() {
  const [anthropicKey, setAnthropicKey] = useState('')
  const [openaiKey, setOpenaiKey] = useState('')
  const [anthropicHasKey, setAnthropicHasKey] = useState(false)
  const [openaiHasKey, setOpenaiHasKey] = useState(false)
  const [anthropicModel, setAnthropicModel] = useState('claude-sonnet-4-5-20250929')
  const [openaiModel, setOpenaiModel] = useState('gpt-4o')
  const [anthropicModels, setAnthropicModels] = useState<ModelInfo[]>([])
  const [openaiModels, setOpenaiModels] = useState<ModelInfo[]>([])
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
    }
    setAnthropicHasKey(keyStatus.anthropic)
    setOpenaiHasKey(keyStatus.openai)

    const settings = (await window.api.invoke(IPC.SETTINGS_GET)) as Record<string, any>
    if (settings.anthropicModel) setAnthropicModel(settings.anthropicModel)
    if (settings.openaiModel) setOpenaiModel(settings.openaiModel)
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
        } else {
          setOpenaiHasKey(true)
          setOpenaiKey('')
        }
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
    } else {
      setOpenaiModel(model)
      await window.api.invoke(IPC.SETTINGS_SET, { openaiModel: model })
    }
  }

  const isStatusError = status?.includes('Error') || status?.includes('Invalid')

  return (
    <div className="space-y-8">
      {status && (
        <div
          className={`p-3 rounded-xl text-sm flex items-center gap-2 ${
            isStatusError
              ? 'bg-red-500/10 text-red-300 border border-red-500/20'
              : 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20'
          }`}
          style={{ animation: 'slide-up 200ms ease-out' }}
        >
          {isStatusError ? <AlertCircle size={14} /> : <CheckCircle2 size={14} />}
          {status}
        </div>
      )}

      {/* Anthropic */}
      <div className="space-y-3">
        <div className="flex items-center gap-2.5">
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">Anthropic (Claude)</h3>
          {anthropicHasKey && (
            <span className="text-[10px] px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-400 font-medium">
              Connected
            </span>
          )}
        </div>

        <div className="flex gap-2">
          <input
            type="password"
            value={anthropicKey}
            onChange={(e) => setAnthropicKey(e.target.value)}
            placeholder={anthropicHasKey ? 'Key saved (enter new to replace)' : 'sk-ant-...'}
            className="flex-1 px-3.5 py-2.5 text-sm bg-[var(--bg-input)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] outline-none focus:border-[var(--border-active)] focus:shadow-[var(--shadow-glow-sm)] transition-all"
          />
          <Button
            size="sm"
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
      <div className="space-y-3">
        <div className="flex items-center gap-2.5">
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">OpenAI</h3>
          {openaiHasKey && (
            <span className="text-[10px] px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-400 font-medium">
              Connected
            </span>
          )}
        </div>

        <div className="flex gap-2">
          <input
            type="password"
            value={openaiKey}
            onChange={(e) => setOpenaiKey(e.target.value)}
            placeholder={openaiHasKey ? 'Key saved (enter new to replace)' : 'sk-...'}
            className="flex-1 px-3.5 py-2.5 text-sm bg-[var(--bg-input)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] outline-none focus:border-[var(--border-active)] focus:shadow-[var(--shadow-glow-sm)] transition-all"
          />
          <Button
            size="sm"
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
    </div>
  )
}

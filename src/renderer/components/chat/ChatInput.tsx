import React, { useState, useRef, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import ReactDOM from 'react-dom'
import { useChatStore } from '../../stores/chatStore'
import { useProjectStore } from '../../stores/projectStore'
import { IPC } from '@shared/ipc-channels'
import type { ModelInfo } from '@shared/types'
import { SendHorizontal, Square, ChevronDown, Check } from 'lucide-react'

export function ChatInput() {
  const { t } = useTranslation('chat')
  const [input, setInput] = useState('')
  const isAgentWorking = useChatStore((s) => s.isAgentWorking)
  const agentPhase = useChatStore((s) => s.agentPhase)
  const sendPrompt = useChatStore((s) => s.sendPrompt)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Model selector state
  const [selectedModel, setSelectedModel] = useState('anthropic/claude-sonnet-4.6')
  const [models, setModels] = useState<ModelInfo[]>([])
  const [isModelOpen, setIsModelOpen] = useState(false)
  const modelRef = useRef<HTMLDivElement>(null)

  // Load OpenRouter models and saved selection on mount
  useEffect(() => {
    const loadModels = async () => {
      const orModels = (await window.api.invoke(IPC.SETTINGS_GET_MODELS, {
        provider: 'openrouter'
      })) as ModelInfo[]
      setModels(orModels)

      const settings = (await window.api.invoke(IPC.SETTINGS_GET)) as Record<string, any>
      if (settings.openrouterModel) {
        setSelectedModel(settings.openrouterModel)
      }
    }
    loadModels()
  }, [])

  const [menuStyle, setMenuStyle] = useState<React.CSSProperties>({})

  const updateMenuPosition = useCallback(() => {
    if (!modelRef.current) return
    const rect = modelRef.current.getBoundingClientRect()
    const menuHeight = Math.min(models.length * 40 + 12, 320)
    setMenuStyle({
      position: 'fixed',
      left: rect.left,
      width: 264,
      bottom: window.innerHeight - rect.top + 4,
      maxHeight: Math.min(rect.top - 8, menuHeight),
      zIndex: 9999
    })
  }, [models.length])

  // Close model dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (modelRef.current && !modelRef.current.contains(e.target as Node)) {
        setIsModelOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    if (isModelOpen) {
      updateMenuPosition()
      window.addEventListener('scroll', updateMenuPosition, true)
      window.addEventListener('resize', updateMenuPosition)
    }
    return () => {
      window.removeEventListener('scroll', updateMenuPosition, true)
      window.removeEventListener('resize', updateMenuPosition)
    }
  }, [isModelOpen, updateMenuPosition])

  const handleModelChange = async (modelId: string) => {
    setSelectedModel(modelId)
    setIsModelOpen(false)
    await window.api.invoke(IPC.SETTINGS_SET, { openrouterModel: modelId })

    // Also update the open project's AI config so periodic status checks stay in sync
    const projectState = useProjectStore.getState()
    if (projectState.isOpen && projectState.manifest) {
      await window.api.invoke(IPC.PROJECT_UPDATE_SETTINGS, {
        aiProvider: 'openrouter',
        aiModel: modelId
      })
      projectState.updateManifest({
        ai: { provider: 'openrouter' as any, model: modelId, keyRef: 'kitapmi-openrouter-key' }
      })
    }

    // Update the status bar model name instantly
    const { refreshModelName } = await import('../../stores/uiStore').then((m) => m.useUIStore.getState())
    refreshModelName('openrouter', modelId)
  }

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 160)}px`
    }
  }, [input])

  const handleSend = () => {
    if (!input.trim() || isAgentWorking) return
    sendPrompt(input.trim())
    setInput('')
  }

  const handleCancel = async () => {
    await window.api.invoke(IPC.AGENT_CANCEL)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const selectedModelInfo = models.find((m) => m.id === selectedModel)

  return (
    <div className="relative shrink-0">
      <div className="px-4 pb-4 pt-2">
        {/* Model selector */}
        <div ref={modelRef} className="relative mb-1.5 -ml-1">
          <button
            onClick={() => setIsModelOpen(!isModelOpen)}
            className="flex items-center gap-1.5 px-1.5 py-1 rounded-[var(--radius-sm)] text-[11.5px] text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] transition-all duration-150"
          >
            <span className="truncate max-w-[200px]">
              {selectedModelInfo?.name || selectedModel}
            </span>
            <ChevronDown
              size={12}
              className={`shrink-0 transition-transform duration-200 ${isModelOpen ? 'rotate-180' : ''}`}
            />
          </button>

          {isModelOpen &&
            ReactDOM.createPortal(
              <div
                className="bg-[var(--bg-elevated)] border border-[var(--border)] rounded-[var(--radius-md)] overflow-y-auto py-1"
                style={{
                  ...menuStyle,
                  animation: 'slide-up 150ms cubic-bezier(0.16, 1, 0.3, 1)',
                  boxShadow: 'var(--elevation-3)'
                }}
                onMouseDown={(e) => e.stopPropagation()}
              >
                {models.map((model) => (
                  <button
                    key={model.id}
                    onClick={() => handleModelChange(model.id)}
                    className={`w-full text-left px-4 py-2.5 text-[13px] flex items-center justify-between hover:bg-[var(--bg-hover)] transition-colors ${
                      model.id === selectedModel
                        ? 'text-[var(--text-accent)]'
                        : 'text-[var(--text-primary)]'
                    }`}
                  >
                    <span className="truncate pr-2">{model.name}</span>
                    {model.id === selectedModel && (
                      <Check size={13} className="shrink-0 text-[var(--text-accent)]" />
                    )}
                  </button>
                ))}
              </div>,
              document.body
            )}
        </div>

        <div className="flex items-end gap-2 rounded-[var(--radius-lg)] border border-[var(--border-strong)] bg-[var(--bg-input)] pl-4 pr-1.5 py-1.5 focus-within:border-[var(--border-active)] transition-colors">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              agentPhase === 'questioning'
                ? t('chat:waitingForAnswers')
                : agentPhase === 'awaiting_plan'
                ? t('chat:reviewPlanAbove')
                : isAgentWorking
                ? t('chat:agentWorking')
                : t('chat:askAnything')
            }
            disabled={isAgentWorking}
            rows={1}
            className="flex-1 bg-transparent text-[var(--text-primary)] py-2 font-serif text-[15.5px] resize-none outline-none placeholder:text-[var(--text-tertiary)] disabled:opacity-60 leading-relaxed"
          />
          {isAgentWorking ? (
            <button
              onClick={handleCancel}
              className="shrink-0 w-9 h-9 flex items-center justify-center rounded-[var(--radius-md)] border border-[var(--border-strong)] text-[var(--text-primary)] hover:bg-[var(--bg-hover)] active:scale-95"
              title={t('chat:stopAgent')}
            >
              <Square size={13} fill="currentColor" />
            </button>
          ) : (
            <button
              onClick={handleSend}
              disabled={!input.trim()}
              className="shrink-0 w-9 h-9 flex items-center justify-center rounded-[var(--radius-md)] bg-[var(--accent-primary)] text-[var(--text-on-accent)] disabled:opacity-35 hover:bg-[var(--accent-primary-strong)] active:scale-95"
            >
              <SendHorizontal size={16} />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

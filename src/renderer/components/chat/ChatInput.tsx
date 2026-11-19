import React, { useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useChatStore } from '../../stores/chatStore'
import { IPC } from '@shared/ipc-channels'
import type { ModelInfo } from '@shared/types'
import { SendHorizontal, Square } from 'lucide-react'
import { ModelPicker } from '../common/ModelPicker'
import { selectWritingModel } from '../../lib/models'

export function ChatInput() {
  const { t } = useTranslation('chat')
  const [input, setInput] = useState('')
  const isAgentWorking = useChatStore((s) => s.isAgentWorking)
  const agentPhase = useChatStore((s) => s.agentPhase)
  const sendPrompt = useChatStore((s) => s.sendPrompt)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Model selector state
  const [selectedModel, setSelectedModel] = useState('')
  const [models, setModels] = useState<ModelInfo[]>([])

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

  const handleModelChange = async (modelId: string) => {
    setSelectedModel(modelId)
    await selectWritingModel(modelId)
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

  return (
    <div className="relative shrink-0">
      <div className="px-4 pb-4 pt-2">
        {/* Model selector */}
        <div className="mb-1.5 -ml-1">
          {selectedModel && (
            <ModelPicker
              models={models}
              value={selectedModel}
              onChange={handleModelChange}
              variant="compact"
              placement="above"
            />
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

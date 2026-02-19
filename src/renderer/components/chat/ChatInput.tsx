import React, { useState, useRef, useEffect, useCallback } from 'react'
import ReactDOM from 'react-dom'
import { useChatStore } from '../../stores/chatStore'
import { IPC } from '@shared/ipc-channels'
import type { ModelInfo } from '@shared/types'
import { SendHorizontal, ChevronDown, Check } from 'lucide-react'

export function ChatInput() {
  const [input, setInput] = useState('')
  const isAgentWorking = useChatStore((s) => s.isAgentWorking)
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

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const selectedModelInfo = models.find((m) => m.id === selectedModel)

  return (
    <div className="relative shrink-0">
      {/* Gradient fade separator — replaces hard border-t */}
      <div className="absolute inset-x-0 -top-8 h-8 bg-gradient-to-b from-transparent to-[var(--bg-chat)] pointer-events-none" />

      {/* Glass-morphism input container */}
      <div className="px-4 pb-5 pt-4 bg-[var(--glass-bg)] backdrop-blur-xl border-t border-[var(--glass-border)]">
        {/* Model selector */}
        <div ref={modelRef} className="relative mb-3">
          <button
            onClick={() => setIsModelOpen(!isModelOpen)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] transition-all duration-150"
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
                className="bg-[var(--bg-elevated)] border border-[var(--border)] rounded-xl overflow-y-auto py-1.5"
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

        <div className="flex items-end gap-3">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isAgentWorking ? 'Agent is working...' : 'Ask the agent anything...'}
            disabled={isAgentWorking}
            rows={1}
            className="flex-1 bg-[var(--bg-input)] text-[var(--text-primary)] border border-[var(--border-subtle)] rounded-2xl px-5 py-4 text-[15px] resize-none outline-none shadow-[inset_0_1px_2px_rgba(0,0,0,0.2),0_0_8px_rgba(129,140,248,0.06)] focus:border-[var(--border-active)] focus:shadow-[inset_0_1px_2px_rgba(0,0,0,0.15),0_0_0_2px_var(--focus-ring-soft),0_0_20px_rgba(129,140,248,0.12)] placeholder:text-[var(--text-tertiary)]/70 disabled:opacity-50 transition-all duration-200 leading-relaxed"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isAgentWorking}
            className="shrink-0 w-12 h-12 flex items-center justify-center rounded-2xl bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-secondary)] text-[var(--text-on-accent)] shadow-[var(--shadow-glow-sm)] disabled:opacity-35 disabled:shadow-none hover:shadow-[var(--shadow-glow)] hover:brightness-110 focus-visible:shadow-[0_0_0_2px_var(--bg-chat),0_0_0_4px_var(--focus-ring)] transition-all duration-200 active:scale-95"
          >
            <SendHorizontal size={18} />
          </button>
        </div>
      </div>
    </div>
  )
}

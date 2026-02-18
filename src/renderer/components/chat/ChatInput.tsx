import React, { useState, useRef, useEffect } from 'react'
import { useChatStore } from '../../stores/chatStore'
import { SendHorizontal } from 'lucide-react'

export function ChatInput() {
  const [input, setInput] = useState('')
  const isAgentWorking = useChatStore((s) => s.isAgentWorking)
  const sendPrompt = useChatStore((s) => s.sendPrompt)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

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

  return (
    <div className="relative shrink-0">
      {/* Gradient fade separator — replaces hard border-t */}
      <div className="absolute inset-x-0 -top-8 h-8 bg-gradient-to-b from-transparent to-[var(--bg-chat)] pointer-events-none" />

      {/* Glass-morphism input container */}
      <div className="px-4 pb-5 pt-5 bg-[var(--glass-bg)] backdrop-blur-xl border-t border-[var(--glass-border)]">
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

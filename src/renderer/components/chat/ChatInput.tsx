import React, { useState, useRef, useEffect } from 'react'
import { useChatStore } from '../../stores/chatStore'

export function ChatInput() {
  const [input, setInput] = useState('')
  const isAgentWorking = useChatStore((s) => s.isAgentWorking)
  const sendPrompt = useChatStore((s) => s.sendPrompt)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`
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
    <div className="p-3 border-t border-[var(--border)] shrink-0">
      <div className="flex items-end gap-2">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={isAgentWorking ? 'Agent is working...' : 'Type a prompt...'}
          disabled={isAgentWorking}
          rows={1}
          className="flex-1 bg-[var(--bg-input)] text-[var(--text-primary)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm resize-none outline-none focus:border-[var(--border-active)] placeholder:text-[var(--text-secondary)] disabled:opacity-50"
        />
        <button
          onClick={handleSend}
          disabled={!input.trim() || isAgentWorking}
          className="shrink-0 w-8 h-8 flex items-center justify-center rounded-lg bg-[var(--text-accent)] text-white disabled:opacity-30 hover:opacity-90 transition-opacity"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
          </svg>
        </button>
      </div>
      <div className="text-[10px] text-[var(--text-secondary)] mt-1 px-1">
        Enter to send, Shift+Enter for new line
      </div>
    </div>
  )
}

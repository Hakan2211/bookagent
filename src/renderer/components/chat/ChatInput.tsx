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
    <div className="p-6 border-t border-[var(--border)] shrink-0 bg-[var(--bg-chat)]">
      <div className="flex items-end gap-3">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={isAgentWorking ? 'Agent is working...' : 'Type a prompt...'}
          disabled={isAgentWorking}
          rows={1}
          className="flex-1 bg-[var(--bg-input)] text-[var(--text-primary)] border border-[var(--border)] rounded-xl px-4 py-3.5 text-[15px] resize-none outline-none focus:border-[var(--border-active)] focus:shadow-[0_0_0_2px_var(--focus-ring-soft),var(--shadow-glow-sm)] placeholder:text-[var(--text-tertiary)]/85 disabled:opacity-50 transition-all leading-relaxed"
        />
        <button
          onClick={handleSend}
          disabled={!input.trim() || isAgentWorking}
          className="shrink-0 w-11 h-11 flex items-center justify-center rounded-xl bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-secondary)] text-[var(--text-on-accent)] disabled:opacity-35 hover:shadow-[var(--shadow-glow)] hover:brightness-110 focus-visible:shadow-[0_0_0_2px_var(--bg-chat),0_0_0_4px_var(--focus-ring)] transition-all active:scale-95"
        >
          <SendHorizontal size={16} />
        </button>
      </div>
      <div className="text-[12px] text-[var(--text-secondary)]/80 mt-3 px-1 font-medium">
        Enter to send, Shift+Enter for new line
      </div>
    </div>
  )
}

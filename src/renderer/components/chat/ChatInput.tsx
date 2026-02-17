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
    <div className="p-3.5 border-t border-[var(--border)] shrink-0">
      <div className="flex items-end gap-2">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={isAgentWorking ? 'Agent is working...' : 'Type a prompt...'}
          disabled={isAgentWorking}
          rows={1}
          className="flex-1 bg-[var(--bg-input)] text-[var(--text-primary)] border border-[var(--border)] rounded-xl px-3.5 py-2.5 text-sm resize-none outline-none focus:border-[var(--border-active)] focus:shadow-[var(--shadow-glow-sm)] placeholder:text-[var(--text-tertiary)] disabled:opacity-40 transition-all leading-relaxed"
        />
        <button
          onClick={handleSend}
          disabled={!input.trim() || isAgentWorking}
          className="shrink-0 w-9 h-9 flex items-center justify-center rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 text-white disabled:opacity-25 hover:shadow-[var(--shadow-glow-sm)] hover:brightness-110 transition-all active:scale-95"
        >
          <SendHorizontal size={15} />
        </button>
      </div>
      <div className="text-[10px] text-[var(--text-tertiary)] mt-1.5 px-1 font-medium">
        Enter to send, Shift+Enter for new line
      </div>
    </div>
  )
}

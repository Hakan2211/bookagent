import React from 'react'
import type { ChatMessage as ChatMessageType } from '@shared/types'
import { formatTimestamp } from '../../lib/formatters'
import { User, Sparkles, AlertCircle } from 'lucide-react'

interface ChatMessageProps {
  message: ChatMessageType
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === 'user'
  const isStreaming = message.status === 'streaming'
  const isError = message.status === 'error'

  return (
    <div
      className={`flex gap-4 ${isUser ? 'flex-row-reverse' : ''}`}
      style={{ animation: 'slide-up 200ms ease-out' }}
    >
      {/* Avatar */}
      <div
        className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
          isUser
            ? 'bg-[var(--bg-active)]'
            : isError
            ? 'bg-[var(--color-error)]/15'
            : 'bg-gradient-to-br from-[var(--accent-primary)]/20 to-[var(--accent-secondary)]/20'
        }`}
      >
        {isUser ? (
          <User size={15} className="text-[var(--text-secondary)]" />
        ) : isError ? (
          <AlertCircle size={15} className="text-[var(--color-error)]" />
        ) : (
          <Sparkles size={15} className="text-[var(--text-accent)]" />
        )}
      </div>

      {/* Bubble */}
      <div
        className={`max-w-[80%] rounded-xl px-5 py-3.5 text-[15px] ${
          isUser
            ? 'bg-gradient-to-br from-[var(--accent-primary)] to-[var(--accent-primary-strong)] text-[var(--text-on-accent)] shadow-[var(--elevation-2)]'
            : isError
            ? 'bg-[var(--color-error)]/10 text-[var(--color-error)] border border-[var(--color-error)]/30'
            : 'bg-[var(--bg-input)] text-[var(--text-primary)] border border-[var(--border)]'
        }`}
      >
        {/* Message content */}
        <div className="whitespace-pre-wrap break-words leading-relaxed">
          {message.content}
          {isStreaming && (
            <span className="inline-block w-1.5 h-4 ml-0.5 bg-[var(--text-accent)] animate-pulse rounded-sm align-text-bottom" />
          )}
        </div>

        {/* Timestamp */}
        <div
          className={`text-[11px] mt-2 font-medium ${
            isUser ? 'text-white/65' : 'text-[var(--text-tertiary)]'
          }`}
        >
          {formatTimestamp(message.timestamp)}
        </div>
      </div>
    </div>
  )
}

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
      className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''}`}
      style={{ animation: 'slide-up 200ms ease-out' }}
    >
      {/* Avatar */}
      <div
        className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
          isUser
            ? 'bg-[var(--bg-active)]'
            : isError
            ? 'bg-red-500/15'
            : 'bg-gradient-to-br from-indigo-500/20 to-violet-500/20'
        }`}
      >
        {isUser ? (
          <User size={13} className="text-[var(--text-secondary)]" />
        ) : isError ? (
          <AlertCircle size={13} className="text-red-400" />
        ) : (
          <Sparkles size={13} className="text-[var(--text-accent)]" />
        )}
      </div>

      {/* Bubble */}
      <div
        className={`max-w-[80%] rounded-xl px-3.5 py-2.5 text-sm ${
          isUser
            ? 'bg-gradient-to-br from-indigo-500 to-indigo-600 text-white shadow-[var(--shadow-sm)]'
            : isError
            ? 'bg-red-500/8 text-red-300 border border-red-500/15'
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
          className={`text-[10px] mt-1.5 font-medium ${
            isUser ? 'text-white/50' : 'text-[var(--text-tertiary)]'
          }`}
        >
          {formatTimestamp(message.timestamp)}
        </div>
      </div>
    </div>
  )
}

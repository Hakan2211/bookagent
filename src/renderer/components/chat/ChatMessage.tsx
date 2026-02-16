import React from 'react'
import type { ChatMessage as ChatMessageType } from '@shared/types'
import { formatTimestamp } from '../../lib/formatters'

interface ChatMessageProps {
  message: ChatMessageType
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === 'user'
  const isStreaming = message.status === 'streaming'
  const isError = message.status === 'error'

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
          isUser
            ? 'bg-[var(--text-accent)] text-white'
            : isError
            ? 'bg-red-600/15 text-red-300 border border-red-600/30'
            : 'bg-[var(--bg-input)] text-[var(--text-primary)]'
        }`}
      >
        {/* Message content */}
        <div className="whitespace-pre-wrap break-words leading-relaxed">
          {message.content}
          {isStreaming && (
            <span className="inline-block w-1.5 h-4 ml-0.5 bg-[var(--text-accent)] animate-pulse rounded-sm" />
          )}
        </div>

        {/* Timestamp */}
        <div
          className={`text-[10px] mt-1 ${
            isUser ? 'text-white/60' : 'text-[var(--text-secondary)]'
          }`}
        >
          {formatTimestamp(message.timestamp)}
        </div>
      </div>
    </div>
  )
}

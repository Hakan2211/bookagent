import React from 'react'
import type { ChatMessage as ChatMessageType } from '@shared/types'
import { formatTimestamp } from '../../lib/formatters'
import { useChatStore } from '../../stores/chatStore'
import { User, Sparkles, AlertCircle, Loader2 } from 'lucide-react'

interface ChatMessageProps {
  message: ChatMessageType
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === 'user'
  const isStreaming = message.status === 'streaming'
  const isError = message.status === 'error'
  const toolActivity = useChatStore((s) => s.toolActivity)

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
          {isStreaming && !toolActivity.length && (
            <span className="inline-block w-1.5 h-4 ml-0.5 bg-[var(--text-accent)] animate-pulse rounded-sm align-text-bottom" />
          )}
        </div>

        {/* Tool activity indicator — shown during streaming when tools are running */}
        {isStreaming && toolActivity.length > 0 && (
          <div className="mt-3 pt-3 border-t border-[var(--border)]/50 space-y-1.5">
            {toolActivity.map((activity, i) => (
              <div
                key={i}
                className={`flex items-center gap-2 text-[12px] ${
                  i === toolActivity.length - 1
                    ? 'text-[var(--text-accent)]'
                    : 'text-[var(--text-tertiary)]'
                }`}
                style={i === toolActivity.length - 1 ? { animation: 'slide-up 150ms ease-out' } : undefined}
              >
                {i === toolActivity.length - 1 ? (
                  <Loader2 size={11} className="shrink-0 animate-spin" />
                ) : (
                  <span className="shrink-0 w-[11px] text-center text-emerald-400">&#10003;</span>
                )}
                <span className="truncate">{activity}</span>
              </div>
            ))}
          </div>
        )}

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

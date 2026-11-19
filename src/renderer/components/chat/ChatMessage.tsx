import React from 'react'
import type { ChatMessage as ChatMessageType } from '@shared/types'
import { formatTimestamp } from '../../lib/formatters'
import { formatCost } from '../../lib/cost'
import { useTranslation } from 'react-i18next'
import { useChatStore } from '../../stores/chatStore'
import { User, AlertCircle, Loader2, Check } from 'lucide-react'
import { Monogram } from './Monogram'

interface ChatMessageProps {
  message: ChatMessageType
}

/**
 * User turns sit in a quiet raised card; the editor (AI) speaks in plain
 * serif text beside its monogram — no bubble, like margin notes.
 */
export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === 'user'
  const isStreaming = message.status === 'streaming'
  const isError = message.status === 'error'
  const toolActivity = useChatStore((s) => s.toolActivity)
  const { t } = useTranslation('common')

  if (isUser) {
    return (
      <div className="group flex gap-3 items-start" style={{ animation: 'slide-up 200ms ease-out' }}>
        <User size={18} strokeWidth={1.5} className="mt-2.5 shrink-0 text-[var(--text-tertiary)]" />
        <div className="min-w-0 flex-1 rounded-[var(--radius-md)] bg-[var(--bg-elevated)] border border-[var(--border)] px-3.5 py-2.5 font-serif text-[15.5px] leading-relaxed text-[var(--text-primary)] whitespace-pre-wrap break-words">
          {message.content}
        </div>
      </div>
    )
  }

  return (
    <div className="group flex gap-3 items-start" style={{ animation: 'slide-up 200ms ease-out' }}>
      <div className="w-[18px] shrink-0 pt-0.5 flex justify-center">
        {isError ? (
          <AlertCircle size={17} strokeWidth={1.5} className="mt-0.5 text-[var(--color-error)]" />
        ) : (
          <Monogram size={22} />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div
          className={`font-serif text-[15.5px] leading-[1.6] whitespace-pre-wrap break-words ${
            isError ? 'text-[var(--color-error)]' : 'text-[var(--text-primary)]'
          }`}
        >
          {message.content}
          {isStreaming && !toolActivity.length && (
            <span className="inline-block w-[2px] h-[1.1em] ml-0.5 bg-[var(--accent-primary)] animate-pulse align-text-bottom" />
          )}
        </div>

        {/* Tool activity — what the editor is doing right now */}
        {isStreaming && toolActivity.length > 0 && (
          <div className="mt-3 pl-3 border-l border-[var(--border-strong)] space-y-1">
            {toolActivity.map((activity, i) => {
              const current = i === toolActivity.length - 1
              return (
                <div
                  key={i}
                  className={`flex items-center gap-2 text-[12.5px] ${current ? 'text-[var(--text-secondary)]' : 'text-[var(--text-tertiary)]'}`}
                >
                  {current ? (
                    <Loader2 size={11} className="shrink-0 animate-spin text-[var(--accent-primary)]" />
                  ) : (
                    <Check size={11} className="shrink-0 text-[var(--color-success)]" />
                  )}
                  <span className="truncate">{activity}</span>
                </div>
              )
            })}
          </div>
        )}

        <div className="mt-1 flex items-center gap-2 text-[11px] text-[var(--text-tertiary)]">
          {!isStreaming && message.cost !== undefined && message.cost > 0 && (
            <span className="tabular-nums" title={t('common:costOfReply')}>
              {formatCost(message.cost)}
            </span>
          )}
          <span className="opacity-0 group-hover:opacity-100 transition-opacity">
            {formatTimestamp(message.timestamp)}
          </span>
        </div>
      </div>
    </div>
  )
}

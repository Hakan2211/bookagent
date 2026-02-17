import React from 'react'
import { ChatContainer } from '../chat/ChatContainer'
import { useProjectStore } from '../../stores/projectStore'
import { Sparkles } from 'lucide-react'

export function ChatPanel() {
  const isOpen = useProjectStore((s) => s.isOpen)

  return (
    <div className="h-full bg-[var(--bg-chat)] flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-[var(--border)] shrink-0">
        <div className="flex items-center gap-2">
          <Sparkles size={13} className="text-[var(--text-accent)]" />
          <h2 className="text-[11px] font-semibold uppercase tracking-widest text-[var(--text-tertiary)]">
            Agent
          </h2>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0">
        {isOpen ? (
          <ChatContainer />
        ) : (
          <div className="p-5 text-sm text-[var(--text-tertiary)]">
            Open a project to use the AI agent
          </div>
        )}
      </div>
    </div>
  )
}

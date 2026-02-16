import React from 'react'
import { ChatContainer } from '../chat/ChatContainer'
import { useProjectStore } from '../../stores/projectStore'

export function ChatPanel() {
  const isOpen = useProjectStore((s) => s.isOpen)

  return (
    <div className="h-full bg-[var(--bg-chat)] flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-3 py-2 border-b border-[var(--border)] shrink-0">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
          Agent
        </h2>
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0">
        {isOpen ? (
          <ChatContainer />
        ) : (
          <div className="p-4 text-sm text-[var(--text-secondary)]">
            Open a project to use the AI agent
          </div>
        )}
      </div>
    </div>
  )
}

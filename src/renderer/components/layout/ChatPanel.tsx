import React from 'react'
import { useTranslation } from 'react-i18next'
import { ChatContainer } from '../chat/ChatContainer'
import { useProjectStore } from '../../stores/projectStore'
import { Sparkles } from 'lucide-react'

export function ChatPanel() {
  const { t } = useTranslation('common')
  const isOpen = useProjectStore((s) => s.isOpen)

  return (
    <div className="h-full bg-[var(--bg-chat)] flex flex-col overflow-hidden border-l border-[var(--border-subtle)]">
      {/* Header */}
      <div className="px-6 py-5 border-b border-[var(--border)] shrink-0">
        <div className="flex items-center gap-3">
          <Sparkles size={16} className="text-[var(--text-accent)]" />
          <h2 className="text-[13px] font-semibold uppercase tracking-[0.12em] text-[var(--text-secondary)]">
            {t('common:agent')}
          </h2>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0">
        {isOpen ? (
          <ChatContainer />
        ) : (
          <div className="p-6 text-[15px] text-[var(--text-secondary)]/80">
            {t('common:openProjectToUseAgent')}
          </div>
        )}
      </div>
    </div>
  )
}

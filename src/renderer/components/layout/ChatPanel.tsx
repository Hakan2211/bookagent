import React from 'react'
import { useTranslation } from 'react-i18next'
import { ChatContainer } from '../chat/ChatContainer'
import { Monogram } from '../chat/Monogram'
import { useProjectStore } from '../../stores/projectStore'
import { useEditorStore } from '../../stores/editorStore'

export function ChatPanel() {
  const { t } = useTranslation(['common', 'chat'])
  const isOpen = useProjectStore((s) => s.isOpen)
  const manifest = useProjectStore((s) => s.manifest)
  const activeChapterId = useEditorStore((s) => s.activeChapterId)
  const activeSectionId = useEditorStore((s) => s.activeSectionId)

  const chapter = manifest?.chapters.find((c) => c.id === activeChapterId)
  const section = chapter?.sections?.find((s) => s.id === activeSectionId)
  const context = section?.title ?? chapter?.title

  return (
    <div className="h-full bg-[var(--bg-chat)] flex flex-col overflow-hidden">
      {/* Header */}
      <div className="h-14 px-5 flex items-center gap-3 shrink-0 border-b border-[var(--border)]">
        <Monogram size={26} />
        <h2 className="font-serif text-[21px] text-[var(--text-primary)]">{t('chat:editorTitle')}</h2>
        {context && (
          <span
            className="ml-auto max-w-[55%] truncate px-2.5 py-1 rounded-[var(--radius-md)] border border-[var(--border-strong)] font-serif text-[13px] text-[var(--text-secondary)]"
            title={t('chat:readingContext', { title: context })}
          >
            {t('chat:readingContext', { title: context })}
          </span>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0">
        {isOpen ? (
          <ChatContainer />
        ) : (
          <div className="p-6 font-serif text-[15px] text-[var(--text-secondary)]">
            {t('common:openProjectToUseAgent')}
          </div>
        )}
      </div>
    </div>
  )
}

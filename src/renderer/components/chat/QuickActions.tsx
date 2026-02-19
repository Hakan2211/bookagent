import React from 'react'
import { useTranslation } from 'react-i18next'
import { useChatStore } from '../../stores/chatStore'
import { useEditorStore } from '../../stores/editorStore'
import { useProjectStore } from '../../stores/projectStore'
import { useUIStore } from '../../stores/uiStore'
import { FileUp } from 'lucide-react'

interface QuickAction {
  label: string
  prompt: string
}

export function QuickActions() {
  const { t } = useTranslation('chat')
  const sendPrompt = useChatStore((s) => s.sendPrompt)
  const isAgentWorking = useChatStore((s) => s.isAgentWorking)
  const activeChapterId = useEditorStore((s) => s.activeChapterId)
  const manifest = useProjectStore((s) => s.manifest)
  const openImportWizard = useUIStore((s) => s.openImportWizard)

  // Actions when NO chapters exist (brand new book)
  const NEW_BOOK_ACTIONS: QuickAction[] = [
    { label: t('chat:newBook.createFirst'), prompt: t('chat:newBook.createFirstPrompt') },
    { label: t('chat:newBook.outlineBook'), prompt: t('chat:newBook.outlineBookPrompt') },
    { label: t('chat:newBook.developCharacters'), prompt: t('chat:newBook.developCharactersPrompt') }
  ]

  // Actions when chapters exist but none is selected
  const NO_CHAPTER_SELECTED_ACTIONS: QuickAction[] = [
    { label: t('chat:noChapter.reviewFull'), prompt: t('chat:noChapter.reviewFullPrompt') },
    { label: t('chat:noChapter.planNext'), prompt: t('chat:noChapter.planNextPrompt') },
    { label: t('chat:noChapter.generateSummaries'), prompt: t('chat:noChapter.generateSummariesPrompt') }
  ]

  // Actions when a chapter IS open (existing behavior)
  const CHAPTER_ACTIONS: QuickAction[] = [
    { label: t('chat:chapter.summarize'), prompt: t('chat:chapter.summarizePrompt') },
    { label: t('chat:chapter.checkInconsistencies'), prompt: t('chat:chapter.checkInconsistenciesPrompt') },
    { label: t('chat:chapter.expand'), prompt: t('chat:chapter.expandPrompt') },
    { label: t('chat:chapter.makeConcise'), prompt: t('chat:chapter.makeConcisePrompt') },
    { label: t('chat:chapter.improveDialogue'), prompt: t('chat:chapter.improveDialoguePrompt') },
    { label: t('chat:chapter.addForeshadowing'), prompt: t('chat:chapter.addForeshadowingPrompt') }
  ]

  const hasChapters = (manifest?.chapters.length || 0) > 0

  let actions: QuickAction[]
  let heading: string

  if (!hasChapters) {
    actions = NEW_BOOK_ACTIONS
    heading = t('chat:getStarted')
  } else if (!activeChapterId) {
    actions = NO_CHAPTER_SELECTED_ACTIONS
    heading = t('chat:quickActions')
  } else {
    actions = CHAPTER_ACTIONS
    heading = t('chat:quickActions')
  }

  return (
    <div className="p-6 space-y-4">
      <p className="text-[13px] font-semibold uppercase tracking-[0.12em] text-[var(--text-secondary)]">
        {heading}
      </p>
      <div className="flex flex-wrap gap-3.5">
        {actions.map((action) => (
          <button
            key={action.label}
            onClick={() => sendPrompt(action.prompt)}
            disabled={isAgentWorking}
            className="text-[14px] px-4 py-3 rounded-xl bg-[var(--bg-input)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] border border-[var(--border)] hover:border-[var(--border-active)] hover:shadow-[var(--shadow-xs)] transition-all disabled:opacity-50 font-medium"
          >
            {action.label}
          </button>
        ))}
        {!hasChapters && (
          <button
            onClick={openImportWizard}
            disabled={isAgentWorking}
            className="text-[14px] px-4 py-3 rounded-xl bg-[var(--bg-input)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] border border-[var(--border)] hover:border-[var(--border-active)] hover:shadow-[var(--shadow-xs)] transition-all disabled:opacity-50 font-medium inline-flex items-center gap-2"
          >
            <FileUp size={14} />
            {t('chat:importManuscript')}
          </button>
        )}
      </div>
    </div>
  )
}

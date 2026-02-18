import React from 'react'
import { useChatStore } from '../../stores/chatStore'
import { useEditorStore } from '../../stores/editorStore'
import { useProjectStore } from '../../stores/projectStore'
import { useUIStore } from '../../stores/uiStore'
import { FileUp } from 'lucide-react'

interface QuickAction {
  label: string
  prompt: string
}

// Actions when NO chapters exist (brand new book)
const NEW_BOOK_ACTIONS: QuickAction[] = [
  {
    label: 'Create my first chapter',
    prompt:
      'Help me create my first chapter. Ask me about my book\'s genre, main characters, and the opening scene before writing.'
  },
  {
    label: 'Help me outline my book',
    prompt:
      'Help me create a detailed outline for my book. Ask me about the genre, themes, main characters, and the general story arc I have in mind.'
  },
  {
    label: 'Develop my characters',
    prompt:
      'Help me develop the main characters for my book. Ask me about the genre and any initial character ideas I have.'
  }
]

// Actions when chapters exist but none is selected
const NO_CHAPTER_SELECTED_ACTIONS: QuickAction[] = [
  {
    label: 'Review the full book',
    prompt:
      'Review my book so far \u2014 check for pacing issues, plot holes, and consistency across all chapters.'
  },
  {
    label: 'Plan the next chapter',
    prompt:
      'Based on what\'s been written so far, help me plan the next chapter. Consider the story arc, unresolved plot threads, and character development.'
  },
  {
    label: 'Generate chapter summaries',
    prompt: 'Generate a brief summary for each chapter in the book so far.'
  }
]

// Actions when a chapter IS open (existing behavior)
const CHAPTER_ACTIONS: QuickAction[] = [
  {
    label: 'Summarize this chapter',
    prompt:
      'Please summarize this chapter, highlighting key events and character development.'
  },
  {
    label: 'Check for inconsistencies',
    prompt:
      'Check this chapter for any inconsistencies with the rest of the book \u2014 timeline issues, character behavior, factual contradictions.'
  },
  {
    label: 'Expand this section',
    prompt:
      'Expand the current chapter with more descriptive detail, deeper character introspection, and sensory details. Maintain the existing voice and style.'
  },
  {
    label: 'Make more concise',
    prompt:
      'Edit this chapter to be more concise. Remove redundant phrases, tighten dialogue, and cut any passages that don\'t advance the plot or character development.'
  },
  {
    label: 'Improve dialogue',
    prompt:
      'Review and improve the dialogue in this chapter. Make each character\'s voice more distinct and ensure conversations feel natural and purposeful.'
  },
  {
    label: 'Add foreshadowing',
    prompt:
      'Add subtle foreshadowing elements to this chapter that hint at events in later chapters. The hints should be natural and not heavy-handed.'
  }
]

export function QuickActions() {
  const sendPrompt = useChatStore((s) => s.sendPrompt)
  const isAgentWorking = useChatStore((s) => s.isAgentWorking)
  const activeChapterId = useEditorStore((s) => s.activeChapterId)
  const manifest = useProjectStore((s) => s.manifest)
  const openImportWizard = useUIStore((s) => s.openImportWizard)

  const hasChapters = (manifest?.chapters.length || 0) > 0

  let actions: QuickAction[]
  let heading: string

  if (!hasChapters) {
    actions = NEW_BOOK_ACTIONS
    heading = 'Get started'
  } else if (!activeChapterId) {
    actions = NO_CHAPTER_SELECTED_ACTIONS
    heading = 'Quick actions'
  } else {
    actions = CHAPTER_ACTIONS
    heading = 'Quick actions'
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
            Import a manuscript
          </button>
        )}
      </div>
    </div>
  )
}

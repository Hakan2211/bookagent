import React from 'react'
import { useChatStore } from '../../stores/chatStore'

const QUICK_ACTIONS = [
  {
    label: 'Summarize this chapter',
    prompt: 'Please summarize this chapter, highlighting key events and character development.'
  },
  {
    label: 'Check for inconsistencies',
    prompt: 'Check this chapter for any inconsistencies with the rest of the book — timeline issues, character behavior, factual contradictions.'
  },
  {
    label: 'Expand this section',
    prompt: 'Expand the current chapter with more descriptive detail, deeper character introspection, and sensory details. Maintain the existing voice and style.'
  },
  {
    label: 'Make more concise',
    prompt: 'Edit this chapter to be more concise. Remove redundant phrases, tighten dialogue, and cut any passages that don\'t advance the plot or character development.'
  },
  {
    label: 'Improve dialogue',
    prompt: 'Review and improve the dialogue in this chapter. Make each character\'s voice more distinct and ensure conversations feel natural and purposeful.'
  },
  {
    label: 'Add foreshadowing',
    prompt: 'Add subtle foreshadowing elements to this chapter that hint at events in later chapters. The hints should be natural and not heavy-handed.'
  }
]

export function QuickActions() {
  const sendPrompt = useChatStore((s) => s.sendPrompt)
  const isAgentWorking = useChatStore((s) => s.isAgentWorking)

  return (
    <div className="p-3 space-y-2">
      <p className="text-xs text-[var(--text-secondary)] mb-2">Quick actions:</p>
      <div className="flex flex-wrap gap-1.5">
        {QUICK_ACTIONS.map((action) => (
          <button
            key={action.label}
            onClick={() => sendPrompt(action.prompt)}
            disabled={isAgentWorking}
            className="text-xs px-2.5 py-1.5 rounded-full bg-[var(--bg-input)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] border border-[var(--border)] transition-colors disabled:opacity-50"
          >
            {action.label}
          </button>
        ))}
      </div>
    </div>
  )
}

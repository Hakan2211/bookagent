import React from 'react'
import { useTranslation } from 'react-i18next'
import { Check } from 'lucide-react'
import type { AgentPhase } from '@shared/types'

const STEPS = ['understand', 'ask', 'plan', 'write'] as const

function activeIndex(phase: AgentPhase): number {
  switch (phase) {
    case 'classifying':
      return 0
    case 'questioning':
      return 1
    case 'planning':
    case 'awaiting_plan':
      return 2
    case 'executing':
      return 3
    case 'done':
      return 4
    default:
      return -1
  }
}

/** Understand · Ask · Plan · Write — where the editor is in its workflow. */
export function AgentStepper({ phase }: { phase: AgentPhase }) {
  const { t } = useTranslation('chat')
  const current = activeIndex(phase)
  if (current < 0) return null

  return (
    <div className="pb-1" style={{ animation: 'fade-in 200ms ease-out' }}>
      <div className="flex items-start">
        {STEPS.map((step, i) => {
          const done = i < current
          const active = i === current
          return (
            <React.Fragment key={step}>
              <div className="flex flex-col items-center gap-1.5 w-14 shrink-0">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center font-serif text-[13px] border ${
                    active
                      ? 'bg-[var(--accent-primary)] border-[var(--accent-primary)] text-[var(--text-on-accent)]'
                      : done
                        ? 'border-[var(--accent-primary)] text-[var(--text-primary)]'
                        : 'border-[var(--border-strong)] text-[var(--text-tertiary)]'
                  }`}
                >
                  {done ? <Check size={13} /> : i + 1}
                </div>
                <span
                  className={`font-serif text-[12.5px] ${active ? 'text-[var(--text-primary)]' : 'text-[var(--text-tertiary)]'}`}
                >
                  {t(`chat:steps.${step}`)}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div
                  className={`flex-1 h-px mt-3.5 ${i < current ? 'bg-[var(--accent-primary)]' : 'bg-[var(--border-strong)]'}`}
                />
              )}
            </React.Fragment>
          )
        })}
      </div>
      {phase !== 'done' && (
        <p className="mt-3 text-center font-serif italic text-[13.5px] text-[var(--text-secondary)]">
          {t(`chat:phase.${phase}`)}
        </p>
      )}
    </div>
  )
}

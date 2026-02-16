import React from 'react'

interface AgentPlanCardProps {
  plan: string
  onProceed?: () => void
  onAdjust?: () => void
}

export function AgentPlanCard({ plan, onProceed, onAdjust }: AgentPlanCardProps) {
  return (
    <div className="mx-3 my-2 p-3 bg-[var(--bg-input)] border border-[var(--border-active)] rounded-lg">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-accent)] mb-1">
        Agent Plan
      </div>
      <p className="text-sm text-[var(--text-primary)] whitespace-pre-wrap">
        {plan}
      </p>
      {(onProceed || onAdjust) && (
        <div className="flex gap-2 mt-2">
          {onProceed && (
            <button
              onClick={onProceed}
              className="text-xs px-3 py-1 rounded bg-[var(--text-accent)] text-white hover:opacity-90"
            >
              Proceed
            </button>
          )}
          {onAdjust && (
            <button
              onClick={onAdjust}
              className="text-xs px-3 py-1 rounded bg-[var(--bg-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            >
              Adjust
            </button>
          )}
        </div>
      )}
    </div>
  )
}

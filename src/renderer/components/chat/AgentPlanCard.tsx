import React from 'react'
import { ListChecks } from 'lucide-react'

interface AgentPlanCardProps {
  plan: string
  onProceed?: () => void
  onAdjust?: () => void
}

export function AgentPlanCard({ plan, onProceed, onAdjust }: AgentPlanCardProps) {
  return (
    <div
      className="mx-4 my-3 p-4 bg-[var(--bg-input)] border border-[var(--border-active)] rounded-xl"
      style={{
        boxShadow: 'var(--shadow-sm), var(--shadow-glow-sm)',
        animation: 'slide-up 200ms ease-out'
      }}
    >
      <div className="flex items-center gap-2 mb-2">
        <ListChecks size={13} className="text-[var(--text-accent)]" />
        <div className="text-[10px] font-semibold uppercase tracking-widest text-[var(--text-accent)]">
          Agent Plan
        </div>
      </div>
      <p className="text-sm text-[var(--text-primary)] whitespace-pre-wrap leading-relaxed">
        {plan}
      </p>
      {(onProceed || onAdjust) && (
        <div className="flex gap-2 mt-3">
          {onProceed && (
            <button
              onClick={onProceed}
              className="text-xs px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-indigo-500 to-violet-500 text-white hover:brightness-110 transition-all font-medium shadow-[var(--shadow-xs)]"
            >
              Proceed
            </button>
          )}
          {onAdjust && (
            <button
              onClick={onAdjust}
              className="text-xs px-3.5 py-1.5 rounded-lg bg-[var(--bg-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all font-medium"
            >
              Adjust
            </button>
          )}
        </div>
      )}
    </div>
  )
}

import React from 'react'
import { useTranslation } from 'react-i18next'
import { ListChecks } from 'lucide-react'

interface AgentPlanCardProps {
  plan: string
  onProceed?: () => void
  onAdjust?: () => void
}

export function AgentPlanCard({ plan, onProceed, onAdjust }: AgentPlanCardProps) {
  const { t } = useTranslation(['editor', 'common'])
  return (
    <div
      className="mx-5 my-4 p-5 bg-[var(--bg-input)] border border-[var(--border-active)] rounded-xl"
      style={{
        boxShadow: 'var(--shadow-sm), var(--shadow-glow-sm)',
        animation: 'slide-up 200ms ease-out'
      }}
    >
      <div className="flex items-center gap-2.5 mb-3">
        <ListChecks size={15} className="text-[var(--text-accent)]" />
        <div className="text-[11px] font-semibold uppercase tracking-widest text-[var(--text-accent)]">
          {t('editor:agentPlan')}
        </div>
      </div>
      <p className="text-[15px] text-[var(--text-primary)] whitespace-pre-wrap leading-relaxed">
        {plan}
      </p>
      {(onProceed || onAdjust) && (
        <div className="flex gap-2.5 mt-4">
          {onProceed && (
            <button
              onClick={onProceed}
              className="text-[13px] px-4 py-2 rounded-lg bg-gradient-to-r from-indigo-500 to-violet-500 text-white hover:brightness-110 transition-all font-medium shadow-[var(--shadow-xs)]"
            >
              {t('common:proceed')}
            </button>
          )}
          {onAdjust && (
            <button
              onClick={onAdjust}
              className="text-[13px] px-4 py-2 rounded-lg bg-[var(--bg-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all font-medium"
            >
              {t('common:adjust')}
            </button>
          )}
        </div>
      )}
    </div>
  )
}

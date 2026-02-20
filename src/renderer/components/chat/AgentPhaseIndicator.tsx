import React from 'react'
import { useTranslation } from 'react-i18next'
import {
  Brain,
  MessageCircleQuestion,
  ListChecks,
  Clock,
  Wrench,
  Check,
  AlertCircle,
  Loader2
} from 'lucide-react'
import type { AgentPhase } from '@shared/types'

interface AgentPhaseIndicatorProps {
  phase: AgentPhase
}

type PhaseConfig = {
  icon: React.ElementType
  colorClass: string
  spinning?: boolean
}

const phaseConfig: Record<AgentPhase, PhaseConfig> = {
  classifying: { icon: Brain, colorClass: 'text-blue-400', spinning: true },
  questioning: { icon: MessageCircleQuestion, colorClass: 'text-amber-400' },
  planning: { icon: ListChecks, colorClass: 'text-violet-400', spinning: true },
  awaiting_plan: { icon: Clock, colorClass: 'text-amber-400' },
  executing: { icon: Wrench, colorClass: 'text-indigo-400', spinning: true },
  done: { icon: Check, colorClass: 'text-emerald-400' },
  error: { icon: AlertCircle, colorClass: 'text-red-400' }
}

export function AgentPhaseIndicator({ phase }: AgentPhaseIndicatorProps) {
  const { t } = useTranslation('chat')

  if (phase === 'done') return null

  const config = phaseConfig[phase]
  const Icon = config.icon

  return (
    <div
      className="flex items-center gap-2 px-3.5 py-2 mx-5 my-2 rounded-lg bg-[var(--bg-input)]/80 border border-[var(--border)]/50"
      style={{ animation: 'slide-up 150ms ease-out' }}
    >
      {config.spinning ? (
        <Loader2 size={13} className={`shrink-0 animate-spin ${config.colorClass}`} />
      ) : (
        <Icon size={13} className={`shrink-0 ${config.colorClass}`} />
      )}
      <span className="text-[12px] font-medium text-[var(--text-secondary)]">
        {t(`chat:phase.${phase}`)}
      </span>
    </div>
  )
}
